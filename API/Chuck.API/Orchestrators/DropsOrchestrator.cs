using Chuck.API.Services;
using Chuck.API.Models;
using Chuck.API.Models.Results;

namespace Chuck.API.Orchestrators;

public class DropsOrchestrator : IDropsOrchestrator
{
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

		// Sum the sizes of request.Files to ensure it doesn't breach the dynamic 500MB quota
		if (hasFiles)
		{
			long totalSizeBytes = request.Files!.Sum(f => f.Length);
			if (totalSizeBytes > 524288000)
			{
				return ProcessUploadResult.Failed("Total file size exceeds the 500MB limit.");
			}
		}

		try
		{
			var (pin, burnToken) = await _dropService.CreateDropAsync(request);
			return ProcessUploadResult.Succeeded(pin, burnToken);
		}
		catch (Exception ex)
		{
			return ProcessUploadResult.Failed(ex.Message);
		}
	}

	public DropSummaryResult GetDropSummary(string pin)
	{
		var payload = _dropService.GetDrop(pin);
		if (payload == null)
		{
			return DropSummaryResult.Failed();
		}

		return DropSummaryResult.Succeeded(payload);
	}

	public FileDownloadResult GetFileForDownload(string pin, string fileId)
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

		if (!_dropService.PayloadFileExists(fileId))
		{
			return FileDownloadResult.Failed("File no longer exists on the server.");
		}

		var path = _dropService.GetPhysicalFilePath(fileId);

		// Extend the TTL on download retrieval
		_dropService.ExtendDropTtl(pin);

		return FileDownloadResult.Succeeded(path, fileMeta.ContentType, fileMeta.OriginalName);
	}

	public ZipDownloadResult GetFilesForZip(string pin)
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

	public bool BurnFile(string pin, string fileId)
	{
		return _dropService.DeleteFile(pin, fileId);
	}

	public bool CancelDrop(string pin, string? token)
	{
		return _dropService.DeleteDrop(pin, token);
	}
}
