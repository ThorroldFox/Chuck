using Chuck.API.Controllers;
using Chuck.API.Models;
using Chuck.API.Models.Responses;
using Chuck.API.Models.Results;
using Chuck.API.Orchestrators;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using NSubstitute;

namespace Chuck.API.Tests.Controllers;

public class DropsControllerTests
{
	private readonly IDropsOrchestrator _orchestrator = Substitute.For<IDropsOrchestrator>();
	private readonly IMemoryCache _cache = new MemoryCache(new MemoryCacheOptions());
	private readonly DropsController _controller;

	public DropsControllerTests()
	{
		_controller = new DropsController(_orchestrator, _cache);
	}

	[Fact]
	public async Task CreateDrop_WhenOrchestratorFails_ReturnsBadRequestWithMessage()
	{
		// Arrange
		var request = new DropRequest();
		_orchestrator.ProcessUploadAsync(request)
			.Returns(ProcessUploadResult.Failed("Payload cannot be completely empty."));

		// Act
		var result = await _controller.CreateDrop(request);

		// Assert
		var badRequest = Assert.IsType<BadRequestObjectResult>(result);
		var response = Assert.IsType<MessageResponse>(badRequest.Value);
		Assert.Equal("Payload cannot be completely empty.", response.Message);
	}

	[Fact]
	public async Task CreateDrop_WhenInsufficientStorage_Returns507WithMessage()
	{
		// Arrange
		var request = new DropRequest();
		_orchestrator.ProcessUploadAsync(request)
			.Returns(ProcessUploadResult.Failed("No space.", UploadFailureReason.InsufficientStorage));

		// Act
		var result = await _controller.CreateDrop(request);

		// Assert
		var statusResult = Assert.IsType<ObjectResult>(result);
		Assert.Equal(StatusCodes.Status507InsufficientStorage, statusResult.StatusCode);
		var response = Assert.IsType<MessageResponse>(statusResult.Value);
		Assert.Equal("No space.", response.Message);
	}

	[Fact]
	public async Task CreateDrop_WhenOrchestratorSucceeds_ReturnsCreatedWithHateoasLocationAndBody()
	{
		// Arrange
		var expectedExpiry = new DateTime(2026, 10, 18, 12, 10, 0, DateTimeKind.Utc);
		var request = new DropRequest { TextPayload = "Secret note", ExpiryMinutes = 30 };
		_orchestrator.ProcessUploadAsync(request)
			.Returns(ProcessUploadResult.Succeeded(5678, "burn-token-abc", 30, expectedExpiry));

		// Act
		var result = await _controller.CreateDrop(request);

		// Assert
		var created = Assert.IsType<CreatedResult>(result);
		Assert.Equal("/api/v1/drops/5678", created.Location);

		var response = Assert.IsType<CreateDropResponse>(created.Value);
		Assert.Equal(5678, response.Pin);
		Assert.Equal(30, response.ExpiresInMinutes);
		Assert.Equal(expectedExpiry, response.ExpiresAt);
		Assert.Equal("burn-token-abc", response.BurnToken);
	}

	[Fact]
	public void GetDropMetadata_WhenDropNotFound_ReturnsNotFound()
	{
		// Arrange
		_orchestrator.GetDropSummary(9999)
			.Returns(DropSummaryResult.Failed("Invalid PIN or payload has expired."));

		// Act
		var result = _controller.GetDropMetadata(9999);

		// Assert
		var notFound = Assert.IsType<NotFoundObjectResult>(result);
		var response = Assert.IsType<MessageResponse>(notFound.Value);
		Assert.Equal("Invalid PIN or payload has expired.", response.Message);
	}

	[Fact]
	public void GetDropMetadata_WhenDropFound_ReturnsOkWithHateoasUrls()
	{
		// Arrange
		var expectedExpiry = new DateTime(2026, 10, 18, 12, 30, 0, DateTimeKind.Utc);
		var payload = new DropPayload
		{
			Pin = 1234,
			TextPayload = "Decrypted text",
			ExpiresAt = expectedExpiry,
			Files = new List<FileMetadata>
			{
				new()
				{
					Id = "file-guid-1",
					OriginalName = "archive.tar",
					SizeBytes = 1024,
					ContentType = "application/x-tar"
				}
			}
		};
		_orchestrator.GetDropSummary(1234).Returns(DropSummaryResult.Succeeded(payload));

		// Act
		var result = _controller.GetDropMetadata(1234);

		// Assert
		var okResult = Assert.IsType<OkObjectResult>(result);
		var response = Assert.IsType<DropMetadataResponse>(okResult.Value);
		Assert.Equal("Decrypted text", response.Text);
		Assert.Equal("/api/v1/drops/1234/zip", response.ZipUrl);
		Assert.Equal("/api/v1/drops/1234", response.BurnUrl);
		Assert.Equal(expectedExpiry, response.ExpiresAt);

		var file = Assert.Single(response.Files);
		Assert.Equal("file-guid-1", file.Id);
		Assert.Equal("archive.tar", file.OriginalName);
		Assert.Equal("/api/v1/drops/1234/files/file-guid-1", file.DownloadUrl);
	}

	[Fact]
	public void DownloadFile_WhenNotFound_ReturnsNotFound()
	{
		// Arrange
		_orchestrator.GetFileForDownload(1234, "bad-id")
			.Returns(FileDownloadResult.Failed("File not found in this drop."));

		// Act
		var result = _controller.DownloadFile(1234, "bad-id");

		// Assert
		var notFound = Assert.IsType<NotFoundObjectResult>(result);
		var response = Assert.IsType<MessageResponse>(notFound.Value);
		Assert.Equal("File not found in this drop.", response.Message);
	}

	[Fact]
	public void DownloadFile_WhenValid_ReturnsPhysicalFileResultWithRangeProcessing()
	{
		// Arrange
		_orchestrator.GetFileForDownload(1234, "file-1")
			.Returns(FileDownloadResult.Succeeded("C:\\drops\\file-1", "application/pdf", "document.pdf"));

		// Act
		var result = _controller.DownloadFile(1234, "file-1");

		// Assert
		var physicalFile = Assert.IsType<PhysicalFileResult>(result);
		Assert.Equal("C:\\drops\\file-1", physicalFile.FileName);
		Assert.Equal("application/pdf", physicalFile.ContentType);
		Assert.Equal("document.pdf", physicalFile.FileDownloadName);
		Assert.True(physicalFile.EnableRangeProcessing);
	}

	[Fact]
	public void GetDownloadStatus_WhenTokenNotInCache_ReturnsNotFound()
	{
		// Act
		var result = _controller.GetDownloadStatus("non-existent-token");

		// Assert
		Assert.IsType<NotFoundResult>(result);
	}

	[Fact]
	public void GetDownloadStatus_WhenTokenInCache_ConsumesTokenAndReturnsOk()
	{
		// Arrange: Set token in cache
		string token = "poll-token-123";
		_cache.Set($"dl_status_{token}", "started", TimeSpan.FromMinutes(5));

		// Act
		var result = _controller.GetDownloadStatus(token);

		// Assert
		var okResult = Assert.IsType<OkObjectResult>(result);
		var response = Assert.IsType<DownloadStatusResponse>(okResult.Value);
		Assert.Equal("started", response.Status);

		// Ensure token was consumed (one-time read)
		Assert.False(_cache.TryGetValue($"dl_status_{token}", out _));
	}

	[Fact]
	public void GetDownloadStatus_WhenTokenExceedsMaxLength_ReturnsNotFound()
	{
		// Arrange: Set an oversized token in cache (> 64 characters)
		string oversizedToken = new string('x', 65);
		_cache.Set($"dl_status_{oversizedToken}", "started", TimeSpan.FromMinutes(5));

		// Act
		var result = _controller.GetDownloadStatus(oversizedToken);

		// Assert
		Assert.IsType<NotFoundResult>(result);
	}

	[Fact]
	public void BurnFile_WhenFileNotFound_ReturnsNotFound()
	{
		// Arrange
		_orchestrator.BurnFile(1111, "file-9").Returns(false);

		// Act
		var result = _controller.BurnFile(1111, "file-9");

		// Assert
		var notFound = Assert.IsType<NotFoundObjectResult>(result);
		var response = Assert.IsType<MessageResponse>(notFound.Value);
		Assert.Equal("File not found or already burnt.", response.Message);
	}

	[Fact]
	public void BurnFile_WhenSuccessful_ReturnsOk()
	{
		// Arrange
		_orchestrator.BurnFile(1111, "file-9").Returns(true);

		// Act
		var result = _controller.BurnFile(1111, "file-9");

		// Assert
		var okResult = Assert.IsType<OkObjectResult>(result);
		var response = Assert.IsType<MessageResponse>(okResult.Value);
		Assert.Equal("File successfully burnt.", response.Message);
	}

	[Fact]
	public void DeleteDrop_WhenDropNotFoundOrTokenMismatch_ReturnsNotFound()
	{
		// Arrange
		_orchestrator.CancelDrop(2222, "bad-token").Returns(false);

		// Act
		var result = _controller.DeleteDrop(2222, "bad-token");

		// Assert
		var notFound = Assert.IsType<NotFoundObjectResult>(result);
		var response = Assert.IsType<MessageResponse>(notFound.Value);
		Assert.Equal("Drop not found or invalid burn token.", response.Message);
	}

	[Fact]
	public void DeleteDrop_WhenSuccessful_ReturnsOk()
	{
		// Arrange
		_orchestrator.CancelDrop(2222, "valid-token").Returns(true);

		// Act
		var result = _controller.DeleteDrop(2222, "valid-token");

		// Assert
		var okResult = Assert.IsType<OkObjectResult>(result);
		var response = Assert.IsType<MessageResponse>(okResult.Value);
		Assert.Equal("Drop successfully burnt.", response.Message);
	}

	[Theory]
	[InlineData(null)]
	[InlineData("")]
	public void GetDropStatus_WhenTokenMissingOrEmpty_ReturnsNotFound(string? token)
	{
		// Act
		var result = _controller.GetDropStatus(3333, token);

		// Assert
		var notFound = Assert.IsType<NotFoundObjectResult>(result);
		var response = Assert.IsType<MessageResponse>(notFound.Value);
		Assert.Equal("Drop not found or invalid burn token.", response.Message);
	}

	[Fact]
	public void GetDropStatus_WhenOrchestratorFails_ReturnsNotFound()
	{
		// Arrange
		_orchestrator.GetDropStatus(3333, "invalid-token")
			.Returns(DropStatusResult.Failed("Drop not found or invalid burn token."));

		// Act
		var result = _controller.GetDropStatus(3333, "invalid-token");

		// Assert
		var notFound = Assert.IsType<NotFoundObjectResult>(result);
		var response = Assert.IsType<MessageResponse>(notFound.Value);
		Assert.Equal("Drop not found or invalid burn token.", response.Message);
	}

	[Fact]
	public void GetDropStatus_WhenActive_ReturnsOkWithStatus()
	{
		// Arrange
		_orchestrator.GetDropStatus(3333, "valid-token")
			.Returns(DropStatusResult.Succeeded("active", isRetrieved: true));

		// Act
		var result = _controller.GetDropStatus(3333, "valid-token");

		// Assert
		var okResult = Assert.IsType<OkObjectResult>(result);
		var response = Assert.IsType<DropStatusResponse>(okResult.Value);
		Assert.Equal("active", response.Status);
		Assert.True(response.IsRetrieved);
	}

	[Fact]
	public void GetDropStatus_WhenBurnt_ReturnsOkWithBurntStatus()
	{
		// Arrange
		_orchestrator.GetDropStatus(3333, "valid-token")
			.Returns(DropStatusResult.Succeeded("burnt", isRetrieved: true));

		// Act
		var result = _controller.GetDropStatus(3333, "valid-token");

		// Assert
		var okResult = Assert.IsType<OkObjectResult>(result);
		var response = Assert.IsType<DropStatusResponse>(okResult.Value);
		Assert.Equal("burnt", response.Status);
		Assert.True(response.IsRetrieved);
	}
}
