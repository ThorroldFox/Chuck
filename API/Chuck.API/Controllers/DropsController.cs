using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Caching.Memory;
using Chuck.API.Orchestrators;
using Chuck.API.Models;
using Chuck.API.Models.Responses;
using System.IO.Compression;

using Chuck.API.Filters;

namespace Chuck.API.Controllers;

[ApiController]
[Route("api/drops")]
[EnableRateLimiting("StrictPolicy")]
[ServiceFilter(typeof(InstancePasscodeFilter))]
public class DropsController : ControllerBase
{
	private readonly IDropsOrchestrator _orchestrator;
	private readonly IMemoryCache _cache;

	public DropsController(IDropsOrchestrator orchestrator, IMemoryCache cache)
	{
		_orchestrator = orchestrator;
		_cache = cache;
	}

	/**
     * <summary>
     * Creates a new ephemeral drop containing text, uploaded files, or both.
     * </summary>
     * <param name="request">Multipart form-data payload containing optional text snippet and attached files.</param>
     * <returns>A <see cref="CreateDropResponse"/> containing the generated PIN, expiry duration, and burn token.</returns>
     * <response code="201">Drop successfully created with allocated PIN and burn token.</response>
     * <response code="400">Payload was empty or total file size exceeded the quota.</response>
     */
	[HttpPost]
	[ProducesResponseType(typeof(CreateDropResponse), StatusCodes.Status201Created)]
	[ProducesResponseType(typeof(MessageResponse), StatusCodes.Status400BadRequest)]
	public async Task<IActionResult> CreateDrop([FromForm] DropRequest request)
	{
		var result = await _orchestrator.ProcessUploadAsync(request);

		if (!result.Success)
		{
			return BadRequest(new MessageResponse { Message = result.Message });
		}

		var response = new CreateDropResponse
		{
			Pin = result.Pin!,
			ExpiresInMinutes = result.ExpiresInMinutes,
			BurnToken = result.BurnToken
		};

		return Created($"/api/drops/{result.Pin}", response);
	}

	/**
     * <summary>
     * Retrieves metadata and download endpoints for an active drop using its 4-digit PIN.
     * </summary>
     * <param name="pin">The 4-digit numeric retrieval PIN.</param>
     * <returns>A <see cref="DropMetadataResponse"/> containing payload details and file endpoints.</returns>
     * <response code="200">Metadata successfully resolved for the provided PIN.</response>
     * <response code="404">Drop not found or has expired from server memory.</response>
     */
	[HttpGet("{pin}")]
	[ProducesResponseType(typeof(DropMetadataResponse), StatusCodes.Status200OK)]
	[ProducesResponseType(typeof(MessageResponse), StatusCodes.Status404NotFound)]
	public IActionResult GetDropMetadata(string pin)
	{
		var result = _orchestrator.GetDropSummary(pin);

		if (!result.Success)
		{
			return NotFound(new MessageResponse { Message = result.Message });
		}

		var response = new DropMetadataResponse
		{
			Text = result.Payload!.TextPayload,
			Files = result.Payload.Files.Select(f => new DropFileResponse
			{
				Id = f.Id,
				OriginalName = f.OriginalName,
				SizeBytes = f.SizeBytes,
				ContentType = f.ContentType,
				DownloadUrl = $"/api/drops/{pin}/files/{f.Id}",
				BurnUrl = $"/api/drops/{pin}/files/{f.Id}"
			}),
			ZipUrl = $"/api/drops/{pin}/zip",
			BurnUrl = $"/api/drops/{pin}"
		};

		return Ok(response);
	}

	/**
     * <summary>
     * Streams an individual file payload from disk to the client.
     * </summary>
     * <param name="pin">The 4-digit numeric retrieval PIN.</param>
     * <param name="fileId">The unique GUID identifier for the file.</param>
     * <returns>A binary file stream with chunked range processing enabled.</returns>
     * <response code="200">File stream successfully initiated.</response>
     * <response code="404">Drop or file ID not found, or file no longer present on server.</response>
     */
	[HttpGet("{pin}/files/{fileId}")]
	[ProducesResponseType(StatusCodes.Status200OK)]
	[ProducesResponseType(typeof(MessageResponse), StatusCodes.Status404NotFound)]
	public IActionResult DownloadFile(string pin, string fileId)
	{
		var result = _orchestrator.GetFileForDownload(pin, fileId);

		if (!result.Success)
		{
			return NotFound(new MessageResponse { Message = result.Message });
		}

		return PhysicalFile(result.FilePath!, result.ContentType!, result.OriginalName, enableRangeProcessing: true);
	}

	/**
     * <summary>
     * Streams all attached files for a drop packaged on-the-fly as an uncompressed ZIP archive.
     * </summary>
     * <param name="pin">The 4-digit numeric retrieval PIN.</param>
     * <param name="token">Optional transient client token for tracking download commencement.</param>
     * <returns>An uncompressed ZIP archive stream (application/zip).</returns>
     * <response code="200">ZIP archive stream successfully initiated.</response>
     * <response code="404">Drop not found or contains no downloadable files.</response>
     */
	[HttpGet("{pin}/zip")]
	[ProducesResponseType(StatusCodes.Status200OK)]
	[ProducesResponseType(typeof(MessageResponse), StatusCodes.Status404NotFound)]
	public async Task DownloadZip(string pin, [FromQuery] string? token)
	{
		var result = _orchestrator.GetFilesForZip(pin);

		if (!result.Success || result.Files == null || result.Files.Count == 0)
		{
			Response.StatusCode = 404;
			await Response.WriteAsJsonAsync(new MessageResponse { Message = result.Message });
			return;
		}

		if (!string.IsNullOrEmpty(token))
		{
			_cache.Set($"dl_status_{token}", "started", TimeSpan.FromMinutes(5));
		}

		var syncIoFeature = HttpContext.Features.Get<Microsoft.AspNetCore.Http.Features.IHttpBodyControlFeature>();
		if (syncIoFeature != null)
		{
			syncIoFeature.AllowSynchronousIO = true;
		}

		Response.ContentType = "application/zip";
		Response.Headers.Append("Content-Disposition", $"attachment; filename=\"Chuck-Payload-{pin}.zip\"");
		Response.Headers.Append("Cache-Control", "no-store, no-cache");

		using (var archive = new ZipArchive(Response.Body, ZipArchiveMode.Create, leaveOpen: true))
		{
			foreach (var file in result.Files)
			{
				var entry = archive.CreateEntry(file.OriginalName, CompressionLevel.NoCompression);
				using (var entryStream = entry.Open())
				using (var fileStream = System.IO.File.OpenRead(file.PhysicalPath))
				{
					await fileStream.CopyToAsync(entryStream);
				}
			}
		}
	}

	/**
     * <summary>
     * Queries the commencement status of an in-flight ZIP archive download.
     * </summary>
     * <param name="token">The transient client polling token passed during ZIP initiation.</param>
     * <returns>A <see cref="DownloadStatusResponse"/> indicating stream status.</returns>
     * <response code="200">Download stream has successfully commenced.</response>
     * <response code="404">Token not found, already consumed, or stream not yet started.</response>
     */
	[HttpGet("status/{token}")]
	[ProducesResponseType(typeof(DownloadStatusResponse), StatusCodes.Status200OK)]
	[ProducesResponseType(StatusCodes.Status404NotFound)]
	public IActionResult GetDownloadStatus(string token)
	{
		if (_cache.TryGetValue($"dl_status_{token}", out string? _))
		{
			_cache.Remove($"dl_status_{token}");
			return Ok(new DownloadStatusResponse { Status = "started" });
		}

		return NotFound();
	}

	/**
     * <summary>
     * Permanently incinerates a single file from the drop, shredding it from disk and updating metadata.
     * </summary>
     * <param name="pin">The 4-digit numeric retrieval PIN.</param>
     * <param name="fileId">The unique GUID identifier for the file to burn.</param>
     * <returns>A <see cref="MessageResponse"/> confirming file destruction.</returns>
     * <response code="200">File successfully burnt and removed from server disk.</response>
     * <response code="404">File not found or already burnt.</response>
     */
	[HttpDelete("{pin}/files/{fileId}")]
	[ProducesResponseType(typeof(MessageResponse), StatusCodes.Status200OK)]
	[ProducesResponseType(typeof(MessageResponse), StatusCodes.Status404NotFound)]
	public IActionResult BurnFile(string pin, string fileId)
	{
		var success = _orchestrator.BurnFile(pin, fileId);

		if (!success)
		{
			return NotFound(new MessageResponse { Message = "File not found or already burnt." });
		}

		return Ok(new MessageResponse { Message = "File successfully burnt." });
	}

	/**
     * <summary>
     * Permanently incinerates an entire drop, shredding all attached files and sidecar metadata from disk and cache.
     * </summary>
     * <param name="pin">The 4-digit numeric retrieval PIN.</param>
     * <param name="token">Optional cryptographic burn token supplied by the sender for pre-retrieval revocation.</param>
     * <returns>A <see cref="MessageResponse"/> confirming drop destruction.</returns>
     * <response code="200">Entire drop successfully burnt and purged from server.</response>
     * <response code="404">Drop not found or invalid burn token provided.</response>
     */
	[HttpDelete("{pin}")]
	[ProducesResponseType(typeof(MessageResponse), StatusCodes.Status200OK)]
	[ProducesResponseType(typeof(MessageResponse), StatusCodes.Status404NotFound)]
	public IActionResult DeleteDrop(string pin, [FromQuery] string? token)
	{
		var success = _orchestrator.CancelDrop(pin, token);

		if (!success)
		{
			return NotFound(new MessageResponse { Message = "Drop not found or invalid burn token." });
		}

		return Ok(new MessageResponse { Message = "Drop successfully burnt." });
	}
}
