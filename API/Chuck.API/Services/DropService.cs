using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Net.Http.Headers;
using Chuck.API.Models;
using nClam;

namespace Chuck.API.Services;

public class DropService : IDropService
{
	private readonly IMemoryCache _cache;
	private readonly IConfiguration _config;
	private readonly ILogger<DropService> _logger;
	private readonly IClamClient? _clamClient;
	private readonly TimeProvider _timeProvider;
	private readonly string _diskStoragePath;

	// ClamAV
	private readonly bool _enableVirusScanning;
	private readonly string _clamAvHost;
	private readonly int _clamAvPort;

	private readonly long _minFreeDiskSpaceBytes;

	/**
	 * <summary>
	 * Default combined file size ceiling for a single drop (500 MB) applied when <c>ChuckSettings:MaxPayloadSizeBytes</c> is unset or invalid.
	 * </summary>
	 */
	public const long DefaultMaxPayloadSizeBytes = 524288000;

	/**
	 * <summary>
	 * Default free disk space reserve (1 GB) that must remain on the storage volume after staging an upload.
	 * </summary>
	 */
	public const long DefaultMinFreeDiskSpaceBytes = 1073741824;

	private const int ExpiryMinutes = 10;
	private const int MinExpiryMinutes = 1;
	private const int MaxAnonymousExpiryMinutes = 30;
	private const int MaxFileNameLength = 255;

	public DropService(
		IMemoryCache cache,
		IConfiguration config,
		ILogger<DropService> logger,
		IClamClient? clamClient = null,
		TimeProvider? timeProvider = null)
	{
		_cache = cache;
		_config = config;
		_logger = logger;
		_clamClient = clamClient;
		_timeProvider = timeProvider ?? TimeProvider.System;

		// Ensure the physical path is absolute for Kestrel's PhysicalFile() method
		string rawPath = _config.GetValue<string>("ChuckSettings:DiskStoragePath") ?? "./app_data/drops";
		_diskStoragePath = Path.GetFullPath(rawPath);

		// Check scanning feature toggle. Defaults to false if not found.
		_enableVirusScanning = _config.GetValue<bool>("ChuckSettings:EnableVirusScanning");

		_clamAvHost = _config.GetValue<string>("ChuckSettings:ClamAvHost") ?? "localhost";
		_clamAvPort = _config.GetValue("ChuckSettings:ClamAvPort", 3310);

		long configuredMaxPayload = _config.GetValue("ChuckSettings:MaxPayloadSizeBytes", DefaultMaxPayloadSizeBytes);
		MaxPayloadSizeBytes = configuredMaxPayload > 0 ? configuredMaxPayload : DefaultMaxPayloadSizeBytes;

		// A value of 0 (or below) explicitly disables the free disk space reserve check.
		_minFreeDiskSpaceBytes = _config.GetValue("ChuckSettings:MinFreeDiskSpaceBytes", DefaultMinFreeDiskSpaceBytes);

		if (!Directory.Exists(_diskStoragePath))
		{
			Directory.CreateDirectory(_diskStoragePath);
		}
	}

	/** <inheritdoc /> */
	public long MaxPayloadSizeBytes { get; }

	/** <inheritdoc /> */
	public bool HasInsufficientStorage(long incomingBytes)
	{
		if (_minFreeDiskSpaceBytes <= 0)
		{
			return false;
		}

		try
		{
			// Windows DriveInfo requires a drive root; Unix resolves the filesystem backing the supplied path
			// (important in Docker, where the drops directory is usually a separate bind mount).
			string driveName = OperatingSystem.IsWindows()
				? Path.GetPathRoot(_diskStoragePath)!
				: _diskStoragePath;

			long availableBytes = new DriveInfo(driveName).AvailableFreeSpace;
			return availableBytes - Math.Max(0, incomingBytes) < _minFreeDiskSpaceBytes;
		}
		catch (Exception ex)
		{
			// Fail open: an unreadable volume must not brick uploads on exotic filesystems.
			_logger.LogWarning(ex, "Unable to determine free disk space for {StoragePath}; skipping storage reserve check.", _diskStoragePath);
			return false;
		}
	}

	public async Task<(int Pin, string BurnToken)> CreateDropAsync(DropRequest request)
	{
		int pin = AllocateUniquePin();

		var burnToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(16)).ToLowerInvariant();
		int expiryMinutes = request.ExpiryMinutes.HasValue
			? Math.Clamp(request.ExpiryMinutes.Value, MinExpiryMinutes, MaxAnonymousExpiryMinutes)
			: ExpiryMinutes;

		var payload = new DropPayload
		{
			Pin = pin,
			BurnToken = burnToken,
			TextPayload = request.TextPayload ?? string.Empty,
			Files = new List<FileMetadata>(),
			ExpiresAt = _timeProvider.GetUtcNow().UtcDateTime.AddMinutes(expiryMinutes)
		};

		if (request.Files != null && request.Files.Count > 0)
		{
			// Only initialise the ClamClient if scanning is enabled or a client was provided
			IClamClient? clam = _clamClient ?? (_enableVirusScanning ? new ClamClient(_clamAvHost, _clamAvPort) : null);

			try
			{
				foreach (var file in request.Files)
				{
					if (file.Length > 0)
					{
						var safeFileName = SanitiseFileName(file.FileName);

						var fileId = Guid.NewGuid().ToString();
						var filePath = Path.Combine(_diskStoragePath, fileId);

						using (var stream = new FileStream(filePath, FileMode.Create, FileAccess.Write, FileShare.None, 1024 * 1024, useAsync: true))
						{
							await file.CopyToAsync(stream);
						}

						bool isFileSafe = true;

						if ((_enableVirusScanning || _clamClient != null) && clam != null)
						{
							try
							{
								var scanResult = await clam.ScanFileOnServerAsync(filePath);

								switch (scanResult.Result)
								{
									case ClamScanResults.Clean:
										isFileSafe = true;
										break;

									case ClamScanResults.VirusDetected:
										File.Delete(filePath);
										var virusName = scanResult.InfectedFiles?.FirstOrDefault()?.VirusName ?? "Unknown Malware";
										_logger.LogWarning("Malware blocked! {Virus} detected in {FileName}.", virusName, safeFileName);
										throw new Exception($"Upload Rejected: Malware ({virusName}) detected in '{safeFileName}'.");

									case ClamScanResults.Error:
										File.Delete(filePath);
										_logger.LogError("ClamAV scan error: {RawResult}", scanResult.RawResult);
										throw new Exception("File scanning service is currently unavailable. Upload aborted.");
								}
							}
							catch (Exception ex) when (!ex.Message.StartsWith("Upload Rejected:") && !ex.Message.StartsWith("File scanning service"))
							{
								File.Delete(filePath);
								_logger.LogError(ex, "Failed to communicate with ClamAV service at {Host}:{Port}", _clamAvHost, _clamAvPort);
								throw new Exception("File scanning service is currently unavailable. Upload aborted.");
							}
						}

						if (isFileSafe)
						{
							// Validate client-supplied Content-Type header to prevent malformed MIME types from
							// throwing a FormatException when Kestrel constructs the download response header.
							string safeContentType = !string.IsNullOrWhiteSpace(file.ContentType)
								&& !file.ContentType.Contains('\r')
								&& !file.ContentType.Contains('\n')
								&& MediaTypeHeaderValue.TryParse(file.ContentType, out _)
								? file.ContentType
								: "application/octet-stream";

							payload.Files.Add(new FileMetadata
							{
								Id = fileId,
								OriginalName = safeFileName,
								SizeBytes = file.Length,
								ContentType = safeContentType,
								IsDownloaded = false
							});
						}
					}
				}
			}
			catch
			{
				// Roll back any files from this batch that were already written to disk before the failure
				foreach (var writtenFile in payload.Files)
				{
					string writtenPath = GetPhysicalFilePath(writtenFile.Id);
					if (File.Exists(writtenPath))
					{
						try { File.Delete(writtenPath); } catch { /* Ignore */ }
					}
				}
				throw;
			}
		}

		SaveToCache(pin, payload, expiryMinutes);
		WriteMetaSidecar(payload);
		return (pin, burnToken);
	}

	public DropPayload? GetDrop(int pin)
	{
		if (_cache.TryGetValue(pin, out DropPayload? payload))
		{
			return payload;
		}
		return null;
	}

	public string GetPhysicalFilePath(string fileId)
	{
		return Path.Combine(_diskStoragePath, Path.GetFileName(fileId));
	}

	public bool PayloadFileExists(string fileId)
	{
		return File.Exists(GetPhysicalFilePath(fileId));
	}

	public bool SidecarExists(int pin)
	{
		return File.Exists(GetMetaSidecarPath(pin));
	}

	public void ExtendDropTtl(int pin)
	{
		if (_cache.TryGetValue(pin, out DropPayload? payload) && payload != null)
		{
			// Extend expiration time by 1 day
			payload.ExpiresAt = _timeProvider.GetUtcNow().UtcDateTime.AddMinutes(1440);
			SaveToCache(pin, payload, TimeSpan.FromMinutes(1440));
			WriteMetaSidecar(payload);
			_logger.LogInformation("TTL extended for Drop {Pin}", pin);
		}
	}

	public bool DeleteFile(int pin, string fileId)
	{
		if (_cache.TryGetValue(pin, out DropPayload? payload) && payload != null)
		{
			var fileMeta = payload.Files.FirstOrDefault(f => f.Id == fileId);
			if (fileMeta != null)
			{
				// Delete from disk using the server-owned file metadata identifier
				string path = GetPhysicalFilePath(fileMeta.Id);
				if (File.Exists(path))
				{
					try { File.Delete(path); } catch { return false; }
				}

				// Remove from the payload list so it no longer shows up in the UI
				payload.Files.Remove(fileMeta);

				// If the drop is now completely empty (no text, no files left), purge the whole drop
				if (payload.Files.Count == 0 && string.IsNullOrWhiteSpace(payload.TextPayload))
				{
					DeleteMetaSidecar(pin);
					_cache.Remove(pin);
				}
				else
				{
					WriteMetaSidecar(payload);
				}

				return true;
			}
		}
		return false;
	}

	public bool DeleteDrop(int pin, string? token = null)
	{
		DropPayload? payload = null;
		if (!_cache.TryGetValue(pin, out payload))
		{
			// Fallback: check if metadata sidecar exists on disk
			string metaPath = GetMetaSidecarPath(pin);
			if (File.Exists(metaPath))
			{
				try
				{
					var json = File.ReadAllText(metaPath);
					payload = JsonSerializer.Deserialize<DropPayload>(json);
				}
				catch { /* Ignore corrupted sidecar */ }
			}
		}

		if (payload == null)
		{
			return false;
		}

		// If a token was provided, verify it matches BurnToken using constant-time comparison to prevent timing side-channels
		if (!string.IsNullOrEmpty(token))
		{
			byte[] candidateBytes = Encoding.UTF8.GetBytes(token);
			byte[] expectedBytes = Encoding.UTF8.GetBytes(payload.BurnToken);
			if (!CryptographicOperations.FixedTimeEquals(candidateBytes, expectedBytes))
			{
				_logger.LogWarning("Unauthorised cancellation attempt for Drop {Pin}: token mismatch.", pin);
				return false;
			}
		}

		// Delete all physical files
		foreach (var file in payload.Files)
		{
			string path = GetPhysicalFilePath(file.Id);
			if (File.Exists(path))
			{
				try { File.Delete(path); } catch { /* Ignore */ }
			}
		}

		// Delete the metadata sidecar
		DeleteMetaSidecar(pin);

		// Evict from RAM cache
		_cache.Remove(pin);

		_logger.LogInformation("Drop {Pin} permanently deleted and burnt.", pin);
		return true;
	}

	public void ExecuteBootSweep()
	{
		if (!Directory.Exists(_diskStoragePath))
		{
			Directory.CreateDirectory(_diskStoragePath);
			return;
		}

		var validFileIds = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
		var nowUtc = _timeProvider.GetUtcNow().UtcDateTime;

		_logger.LogInformation("Executing startup Boot Sweep on {StoragePath}...", _diskStoragePath);

		// Scan and inspect all metadata sidecars
		foreach (var metaFile in Directory.GetFiles(_diskStoragePath, "*_meta.json"))
		{
			try
			{
				var json = File.ReadAllText(metaFile);
				var payload = JsonSerializer.Deserialize<DropPayload>(json);

				if (payload == null || payload.ExpiresAt <= nowUtc)
				{
					_logger.LogInformation("Boot Sweep: Purging expired drop {Pin}", payload?.Pin.ToString() ?? Path.GetFileNameWithoutExtension(metaFile));
					PurgePayloadFilesAndSidecar(payload, metaFile);
				}
				else
				{
					// Valid: Track active files and re-hydrate into IMemoryCache
					var remainingTtl = payload.ExpiresAt - nowUtc;
					SaveToCache(payload.Pin, payload, remainingTtl);
					foreach (var f in payload.Files)
					{
						validFileIds.Add(f.Id);
					}
					_logger.LogInformation("Boot Sweep: Re-hydrated drop {Pin} with remaining TTL {TtlMinutes}m", payload.Pin, Math.Round(remainingTtl.TotalMinutes, 1));
				}
			}
			catch (Exception ex)
			{
				_logger.LogWarning(ex, "Boot Sweep: Corrupt metadata sidecar {MetaFile}. Purging.", metaFile);
				try { File.Delete(metaFile); } catch { /* Ignore */ }
			}
		}

		// Shred orphaned binary files with no registered sidecar (including clean cleanup of legacy v1.0.0 files)
		foreach (var file in Directory.GetFiles(_diskStoragePath))
		{
			if (file.EndsWith("_meta.json", StringComparison.OrdinalIgnoreCase)) continue;
			string fileName = Path.GetFileName(file);
			if (!validFileIds.Contains(fileName))
			{
				try
				{
					File.Delete(file);
					_logger.LogInformation("Boot Sweep: Shredded orphaned binary file {FileName}", fileName);
				}
				catch (Exception ex)
				{
					_logger.LogWarning(ex, "Boot Sweep: Failed to delete orphaned file {FileName}", fileName);
				}
			}
		}

		_logger.LogInformation("Boot Sweep completed successfully.");
	}

	private void PurgePayloadFilesAndSidecar(DropPayload? payload, string metaFilePath)
	{
		if (payload != null)
		{
			foreach (var f in payload.Files)
			{
				string path = GetPhysicalFilePath(f.Id);
				if (File.Exists(path))
				{
					try { File.Delete(path); } catch { /* Ignore */ }
				}
			}
		}

		if (File.Exists(metaFilePath))
		{
			try { File.Delete(metaFilePath); } catch { /* Ignore */ }
		}
	}

	public string GetMetaSidecarPath(int pin)
	{
		return Path.Combine(_diskStoragePath, $"{pin}_meta.json");
	}

	private void WriteMetaSidecar(DropPayload payload)
	{
		try
		{
			string metaPath = GetMetaSidecarPath(payload.Pin);
			var json = JsonSerializer.Serialize(payload, new JsonSerializerOptions { WriteIndented = true });
			File.WriteAllText(metaPath, json);
		}
		catch (Exception ex)
		{
			_logger.LogError(ex, "Failed to write metadata sidecar for Drop {Pin}", payload.Pin);
		}
	}

	private void DeleteMetaSidecar(int pin)
	{
		try
		{
			string metaPath = GetMetaSidecarPath(pin);
			if (File.Exists(metaPath))
			{
				File.Delete(metaPath);
			}
		}
		catch (Exception ex)
		{
			_logger.LogError(ex, "Failed to delete metadata sidecar for Drop {Pin}", pin);
		}
	}

	private void SaveToCache(int pin, DropPayload payload, TimeSpan ttl)
	{
		var cacheOptions = new MemoryCacheEntryOptions()
			.SetAbsoluteExpiration(ttl);

		cacheOptions.RegisterPostEvictionCallback((key, value, reason, state) =>
		{
			// If the cache entry is just being replaced (Extend TTL), DO NOT delete the physical files!
			if (reason == EvictionReason.Replaced)
			{
				return;
			}

			if (value is DropPayload expiredPayload)
			{
				foreach (var f in expiredPayload.Files)
				{
					string path = GetPhysicalFilePath(f.Id);
					if (File.Exists(path))
					{
						try { File.Delete(path); } catch { /* Ignore */ }
					}
				}

				DeleteMetaSidecar(expiredPayload.Pin);
			}
		});

		_cache.Set(pin, payload, cacheOptions);
	}

	private void SaveToCache(int pin, DropPayload payload, int minutesAlive)
	{
		SaveToCache(pin, payload, TimeSpan.FromMinutes(minutesAlive));
	}

	private int AllocateUniquePin()
	{
		// Fast path: attempt up to 100 cryptographically random picks across the 9,000-PIN space (1000-9999)
		for (int attempt = 0; attempt < 100; attempt++)
		{
			int candidate = RandomNumberGenerator.GetInt32(1000, 10000);
			if (!_cache.TryGetValue(candidate, out _))
			{
				return candidate;
			}
		}

		// Bounded fallback: scan linearly from a random start index to prevent an infinite CPU spin-loop if the pool is nearly full
		int startOffset = RandomNumberGenerator.GetInt32(0, 9000);
		for (int i = 0; i < 9000; i++)
		{
			int candidate = 1000 + ((startOffset + i) % 9000);
			if (!_cache.TryGetValue(candidate, out _))
			{
				return candidate;
			}
		}

		throw new InvalidOperationException("Maximum active drop capacity reached. Please try again shortly.");
	}

	private static string SanitiseFileName(string? rawFileName)
	{
		if (string.IsNullOrWhiteSpace(rawFileName))
		{
			return "unnamed-file";
		}

		// Normalise backslashes to forward slashes before calling Path.GetFileName so Windows-style traversal
		// sequences (e.g. "..\..\evil.exe") are stripped even when running inside a Linux Docker container,
		// preventing cross-platform Zip Slip on archive extraction.
		string fileNameOnly = Path.GetFileName(rawFileName.Replace('\\', '/'));

		// Strip ASCII control characters (including CR, LF, and null bytes) to prevent HTTP Content-Disposition
		// header splitting, null-byte truncation, and log forging.
		var sb = new StringBuilder(fileNameOnly.Length);
		foreach (char c in fileNameOnly)
		{
			if (!char.IsControl(c))
			{
				sb.Append(c);
			}
		}

		string cleaned = sb.ToString().Trim();
		if (string.IsNullOrWhiteSpace(cleaned) || cleaned is "." or "..")
		{
			return "unnamed-file";
		}

		// Cap filename length at 255 characters while preserving the file extension if truncated
		if (cleaned.Length > MaxFileNameLength)
		{
			string extension = Path.GetExtension(cleaned);
			if (!string.IsNullOrEmpty(extension) && extension.Length < MaxFileNameLength)
			{
				int stemLength = MaxFileNameLength - extension.Length;
				cleaned = string.Concat(cleaned.AsSpan(0, stemLength), extension);
			}
			else
			{
				cleaned = cleaned[..MaxFileNameLength];
			}
		}

		return cleaned;
	}
}
