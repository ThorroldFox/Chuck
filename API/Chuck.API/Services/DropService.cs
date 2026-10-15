using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
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

	private const int ExpiryMinutes = 10;

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

		if (!Directory.Exists(_diskStoragePath))
		{
			Directory.CreateDirectory(_diskStoragePath);
		}
	}

	public async Task<(string Pin, string BurnToken)> CreateDropAsync(DropRequest request)
	{
		string pin;
		do
		{
			pin = RandomNumberGenerator.GetInt32(1000, 10000).ToString();
		}
		while (_cache.TryGetValue(pin, out _));

		var burnToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(16)).ToLowerInvariant();

		var payload = new DropPayload
		{
			Pin = pin,
			BurnToken = burnToken,
			TextPayload = request.TextPayload ?? string.Empty,
			Files = new List<FileMetadata>(),
			ExpiresAt = _timeProvider.GetUtcNow().UtcDateTime.AddMinutes(ExpiryMinutes)
		};

		if (request.Files != null && request.Files.Count > 0)
		{
			// Only initialise the ClamClient if scanning is enabled or a client was provided
			IClamClient? clam = _clamClient ?? (_enableVirusScanning ? new ClamClient(_clamAvHost, _clamAvPort) : null);

			foreach (var file in request.Files)
			{
				if (file.Length > 0)
				{
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
									_logger.LogWarning("Malware blocked! {Virus} detected in {FileName}.", virusName, file.FileName);
									throw new Exception($"Upload Rejected: Malware ({virusName}) detected in '{file.FileName}'.");

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
						payload.Files.Add(new FileMetadata
						{
							Id = fileId,
							OriginalName = file.FileName,
							SizeBytes = file.Length,
							ContentType = file.ContentType,
							IsDownloaded = false
						});
					}
				}
			}
		}

		SaveToCache(pin, payload, ExpiryMinutes);
		WriteMetaSidecar(payload);
		return (pin, burnToken);
	}

	public DropPayload? GetDrop(string pin)
	{
		if (_cache.TryGetValue(pin, out DropPayload? payload))
		{
			return payload;
		}
		return null;
	}

	public string GetPhysicalFilePath(string fileId)
	{
		return Path.Combine(_diskStoragePath, fileId);
	}

	public bool PayloadFileExists(string fileId)
	{
		return File.Exists(GetPhysicalFilePath(fileId));
	}

	public bool SidecarExists(string pin)
	{
		return File.Exists(GetMetaSidecarPath(pin));
	}

	public void ExtendDropTtl(string pin)
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

	public bool DeleteFile(string pin, string fileId)
	{
		if (_cache.TryGetValue(pin, out DropPayload? payload) && payload != null)
		{
			var fileMeta = payload.Files.FirstOrDefault(f => f.Id == fileId);
			if (fileMeta != null)
			{
				// Delete from disk
				string path = GetPhysicalFilePath(fileId);
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

	public bool DeleteDrop(string pin, string? token = null)
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

		// If a token was provided, verify it matches BurnToken
		if (!string.IsNullOrEmpty(token) && !string.Equals(token, payload.BurnToken, StringComparison.Ordinal))
		{
			_logger.LogWarning("Unauthorised cancellation attempt for Drop {Pin}: token mismatch.", pin);
			return false;
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
					_logger.LogInformation("Boot Sweep: Purging expired drop {Pin}", payload?.Pin ?? Path.GetFileNameWithoutExtension(metaFile));
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

	public string GetMetaSidecarPath(string pin)
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

	private void DeleteMetaSidecar(string pin)
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

	private void SaveToCache(string pin, DropPayload payload, TimeSpan ttl)
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

	private void SaveToCache(string pin, DropPayload payload, int minutesAlive)
	{
		SaveToCache(pin, payload, TimeSpan.FromMinutes(minutesAlive));
	}
}
