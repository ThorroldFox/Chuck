using Chuck.API.Services;
using Chuck.API.Models;
using Chuck.API.Models.Results;

namespace Chuck.API.Orchestrators;

public class DropsOrchestrator : IDropsOrchestrator
{
	public const int MaxTextPayloadLength = 100000;
	private readonly IDropService _dropService;

	public DropsOrchestrator(IDropService dropService)
	{
		_dropService = dropService;
	}

	public async Task<ProcessUploadResult> ProcessUploadAsync(DropRequest request)
	{
		bool hasText = !string.IsNullOrWhiteSpace(request.TextPayload);
		bool hasFiles = request.Files != null && request.Files.Count > 0;

		if (!hasText && !hasFiles)
		{
			return ProcessUploadResult.Failed("Payload cannot be completely empty.");
		}

		if (hasText && request.TextPayload!.Length > MaxTextPayloadLength)
		{
			return ProcessUploadResult.Failed("Text payload exceeds the 100,000-character limit.");
		}

		if (request.ExpiryMinutes.HasValue && (request.ExpiryMinutes.Value < 1 || request.ExpiryMinutes.Value > 30))
		{
			return ProcessUploadResult.Failed("Expiry duration for anonymous drops must be between 1 and 30 minutes.");
		}

		// Sum the sizes of request.Files to ensure it doesn't breach the configured payload quota (ChuckSettings:MaxPayloadSizeBytes)
		long totalSizeBytes = 0;
		if (hasFiles)
		{
			totalSizeBytes = request.Files!.Sum(f => f.Length);
			if (totalSizeBytes > _dropService.MaxPayloadSizeBytes)
			{
				return ProcessUploadResult.Failed($"Total file size exceeds the {FormatByteLimit(_dropService.MaxPayloadSizeBytes)} limit.");
			}
		}

		// Pre-flight disk space guard: refuse uploads that would erode the host's free space reserve (HTTP 507)
		if (_dropService.HasInsufficientStorage(totalSizeBytes))
		{
			return ProcessUploadResult.Failed(
				"Chuck does not have enough free disk space to accept this upload right now.",
				UploadFailureReason.InsufficientStorage);
		}

		try
		{
			int expiryMinutes = request.ExpiryMinutes ?? 10;
			var (pin, burnToken) = await _dropService.CreateDropAsync(request);
			var createdDrop = _dropService.GetDrop(pin);
			return ProcessUploadResult.Succeeded(pin, burnToken, expiryMinutes, createdDrop?.ExpiresAt);
		}
		catch (Exception ex)
		{
			return ProcessUploadResult.Failed(ex.Message);
		}
	}

	public DropSummaryResult GetDropSummary(int pin)
	{
		var payload = _dropService.GetDrop(pin);
		if (payload == null)
		{
			return DropSummaryResult.Failed();
		}

		return DropSummaryResult.Succeeded(payload);
	}

	public FileDownloadResult GetFileForDownload(int pin, string fileId)
	{
		var payload = _dropService.GetDrop(pin);
		if (payload == null)
		{
			return FileDownloadResult.Failed("Invalid PIN or payload has expired.");
		}

		var fileMeta = payload.Files.FirstOrDefault(f => f.Id == fileId);
		if (fileMeta == null)
		{
			return FileDownloadResult.Failed("File not found in this drop.");
		}

		if (!_dropService.PayloadFileExists(fileMeta.Id))
		{
			return FileDownloadResult.Failed("File no longer exists on the server.");
		}

		var path = _dropService.GetPhysicalFilePath(fileMeta.Id);

		// Extend the TTL on download retrieval
		_dropService.ExtendDropTtl(pin);

		return FileDownloadResult.Succeeded(path, fileMeta.ContentType, fileMeta.OriginalName);
	}

	public ZipDownloadResult GetFilesForZip(int pin)
	{
		var payload = _dropService.GetDrop(pin);
		if (payload == null)
		{
			return ZipDownloadResult.Failed("Invalid PIN or payload has expired.");
		}

		var files = new List<ZipFileEntry>();
		foreach (var f in payload.Files)
		{
			if (_dropService.PayloadFileExists(f.Id))
			{
				files.Add(new ZipFileEntry(_dropService.GetPhysicalFilePath(f.Id), f.OriginalName));
			}
		}

		if (files.Count > 0)
		{
			_dropService.ExtendDropTtl(pin);
		}

		return ZipDownloadResult.Succeeded(files);
	}

	public bool BurnFile(int pin, string fileId)
	{
		return _dropService.DeleteFile(pin, fileId);
	}

	public bool CancelDrop(int pin, string? token)
	{
		return _dropService.DeleteDrop(pin, token);
	}

	/// <summary>
	/// Renders a byte ceiling as a compact human-readable limit (e.g. 524288000 becomes "500MB", 1073741824 becomes "1GB").
	/// </summary>
	private static string FormatByteLimit(long bytes)
	{
		const long mebibyte = 1024L * 1024;
		const long gibibyte = mebibyte * 1024;

		if (bytes >= gibibyte && bytes % gibibyte == 0)
		{
			return $"{bytes / gibibyte}GB";
		}

		if (bytes >= mebibyte)
		{
			return $"{Math.Round((double)bytes / mebibyte, 2).ToString("0.##", System.Globalization.CultureInfo.InvariantCulture)}MB";
		}

		return $"{bytes} bytes";
	}
}
