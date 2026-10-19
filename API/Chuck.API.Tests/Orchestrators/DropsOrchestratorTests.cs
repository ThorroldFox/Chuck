using Chuck.API.Models;
using Chuck.API.Orchestrators;
using Chuck.API.Services;
using Microsoft.AspNetCore.Http;
using NSubstitute;
using NSubstitute.ExceptionExtensions;

namespace Chuck.API.Tests.Orchestrators;

public class DropsOrchestratorTests
{
	private readonly IDropService _dropService = Substitute.For<IDropService>();
	private readonly DropsOrchestrator _orchestrator;

	public DropsOrchestratorTests()
	{
		_orchestrator = new DropsOrchestrator(_dropService);
	}

	[Fact]
	public async Task ProcessUploadAsync_WhenBothTextAndFilesAreEmpty_ReturnsFailure()
	{
		// Arrange
		var request = new DropRequest
		{
			TextPayload = "   ",
			Files = null
		};

		// Act
		var result = await _orchestrator.ProcessUploadAsync(request);

		// Assert
		Assert.False(result.Success);
		Assert.Equal("Payload cannot be completely empty.", result.Message);
		Assert.Equal(0, result.Pin);
		Assert.Null(result.BurnToken);
	}

	[Fact]
	public async Task ProcessUploadAsync_WhenTextPayloadExceedsCharacterLimit_ReturnsFailure()
	{
		// Arrange
		var request = new DropRequest
		{
			TextPayload = new string('A', DropsOrchestrator.MaxTextPayloadLength + 1),
			Files = null
		};

		// Act
		var result = await _orchestrator.ProcessUploadAsync(request);

		// Assert
		Assert.False(result.Success);
		Assert.Equal("Text payload exceeds the 100,000-character limit.", result.Message);
		await _dropService.DidNotReceive().CreateDropAsync(Arg.Any<DropRequest>());
	}

	[Fact]
	public async Task ProcessUploadAsync_WhenTotalFileSizeExceedsQuota_ReturnsFailure()
	{
		// Arrange: 500 MB is 524,288,000 bytes
		var oversizedFile = Substitute.For<IFormFile>();
		oversizedFile.Length.Returns(524288001);

		var request = new DropRequest
		{
			Files = new FormFileCollection { oversizedFile }
		};

		// Act
		var result = await _orchestrator.ProcessUploadAsync(request);

		// Assert
		Assert.False(result.Success);
		Assert.Equal("Total file size exceeds the 500MB limit.", result.Message);
		await _dropService.DidNotReceive().CreateDropAsync(Arg.Any<DropRequest>());
	}

	[Fact]
	public async Task ProcessUploadAsync_WhenValidRequest_DelegatesToDropServiceAndReturnsSuccess()
	{
		// Arrange
		var expectedExpiry = new DateTime(2026, 10, 18, 12, 10, 0, DateTimeKind.Utc);
		var request = new DropRequest
		{
			TextPayload = "Secret transfer memo"
		};
		_dropService.CreateDropAsync(request).Returns((1234, "burn-token-xyz"));
		_dropService.GetDrop(1234).Returns(new DropPayload { Pin = 1234, ExpiresAt = expectedExpiry });

		// Act
		var result = await _orchestrator.ProcessUploadAsync(request);

		// Assert
		Assert.True(result.Success);
		Assert.Equal(1234, result.Pin);
		Assert.Equal("burn-token-xyz", result.BurnToken);
		Assert.Equal(10, result.ExpiresInMinutes);
		Assert.Equal(expectedExpiry, result.ExpiresAt);
		Assert.Equal("Drop created successfully.", result.Message);
	}

	[Theory]
	[InlineData(0)]
	[InlineData(-5)]
	[InlineData(31)]
	[InlineData(1440)]
	public async Task ProcessUploadAsync_WhenExpiryMinutesOutOfBounds_ReturnsFailure(int invalidExpiryMinutes)
	{
		// Arrange
		var request = new DropRequest
		{
			TextPayload = "Test bounds",
			ExpiryMinutes = invalidExpiryMinutes
		};

		// Act
		var result = await _orchestrator.ProcessUploadAsync(request);

		// Assert
		Assert.False(result.Success);
		Assert.Equal("Expiry duration for anonymous drops must be between 1 and 30 minutes.", result.Message);
		await _dropService.DidNotReceive().CreateDropAsync(Arg.Any<DropRequest>());
	}

	[Fact]
	public async Task ProcessUploadAsync_WithCustomValidExpiryMinutes_PropagatesSelectedDuration()
	{
		// Arrange
		var expectedExpiry = new DateTime(2026, 10, 18, 12, 30, 0, DateTimeKind.Utc);
		var request = new DropRequest
		{
			TextPayload = "Thirty minute drop",
			ExpiryMinutes = 30
		};
		_dropService.CreateDropAsync(request).Returns((7890, "burn-token-30"));
		_dropService.GetDrop(7890).Returns(new DropPayload { Pin = 7890, ExpiresAt = expectedExpiry });

		// Act
		var result = await _orchestrator.ProcessUploadAsync(request);

		// Assert
		Assert.True(result.Success);
		Assert.Equal(7890, result.Pin);
		Assert.Equal(30, result.ExpiresInMinutes);
		Assert.Equal(expectedExpiry, result.ExpiresAt);
	}

	[Fact]
	public async Task ProcessUploadAsync_WhenDropServiceThrows_ReturnsFailureWithMessage()
	{
		// Arrange
		var request = new DropRequest
		{
			TextPayload = "Trigger malware exception"
		};
		_dropService.CreateDropAsync(request).Throws(new Exception("Upload Rejected: Malware detected."));

		// Act
		var result = await _orchestrator.ProcessUploadAsync(request);

		// Assert
		Assert.False(result.Success);
		Assert.Equal("Upload Rejected: Malware detected.", result.Message);
	}

	[Fact]
	public void GetDropSummary_WhenPinNotFound_ReturnsFailure()
	{
		// Arrange
		_dropService.GetDrop(9999).Returns((DropPayload?)null);

		// Act
		var result = _orchestrator.GetDropSummary(9999);

		// Assert
		Assert.False(result.Success);
		Assert.Equal("Invalid PIN or payload has expired.", result.Message);
		Assert.Null(result.Payload);
	}

	[Fact]
	public void GetDropSummary_WhenPinExists_ReturnsPayload()
	{
		// Arrange
		var payload = new DropPayload
		{
			Pin = 4321,
			TextPayload = "Hello Chuck"
		};
		_dropService.GetDrop(4321).Returns(payload);

		// Act
		var result = _orchestrator.GetDropSummary(4321);

		// Assert
		Assert.True(result.Success);
		Assert.Equal(payload, result.Payload);
	}

	[Fact]
	public void GetFileForDownload_WhenDropNotFound_ReturnsFailure()
	{
		// Arrange
		_dropService.GetDrop(0).Returns((DropPayload?)null);

		// Act
		var result = _orchestrator.GetFileForDownload(0, "file-id");

		// Assert
		Assert.False(result.Success);
		Assert.Equal("Invalid PIN or payload has expired.", result.Message);
	}

	[Fact]
	public void GetFileForDownload_WhenFileNotInPayload_ReturnsFailure()
	{
		// Arrange
		var payload = new DropPayload
		{
			Pin = 1111,
			Files = new List<FileMetadata>()
		};
		_dropService.GetDrop(1111).Returns(payload);

		// Act
		var result = _orchestrator.GetFileForDownload(1111, "missing-file-id");

		// Assert
		Assert.False(result.Success);
		Assert.Equal("File not found in this drop.", result.Message);
	}

	[Fact]
	public void GetFileForDownload_WhenPayloadFileNotOnDisk_ReturnsFailure()
	{
		// Arrange
		var fileMeta = new FileMetadata
		{
			Id = "file-123",
			OriginalName = "notes.txt",
			ContentType = "text/plain"
		};
		var payload = new DropPayload
		{
			Pin = 2222,
			Files = new List<FileMetadata> { fileMeta }
		};
		_dropService.GetDrop(2222).Returns(payload);
		_dropService.PayloadFileExists("file-123").Returns(false);

		// Act
		var result = _orchestrator.GetFileForDownload(2222, "file-123");

		// Assert
		Assert.False(result.Success);
		Assert.Equal("File no longer exists on the server.", result.Message);
		_dropService.DidNotReceive().ExtendDropTtl(Arg.Any<int>());
	}

	[Fact]
	public void GetFileForDownload_WhenValid_ExtendsTtlAndReturnsPhysicalPath()
	{
		// Arrange
		var fileMeta = new FileMetadata
		{
			Id = "file-abc",
			OriginalName = "contract.pdf",
			ContentType = "application/pdf"
		};
		var payload = new DropPayload
		{
			Pin = 3333,
			Files = new List<FileMetadata> { fileMeta }
		};
		_dropService.GetDrop(3333).Returns(payload);
		_dropService.PayloadFileExists("file-abc").Returns(true);
		_dropService.GetPhysicalFilePath("file-abc").Returns("/storage/drops/file-abc");

		// Act
		var result = _orchestrator.GetFileForDownload(3333, "file-abc");

		// Assert
		Assert.True(result.Success);
		Assert.Equal("/storage/drops/file-abc", result.FilePath);
		Assert.Equal("contract.pdf", result.OriginalName);
		Assert.Equal("application/pdf", result.ContentType);
		_dropService.Received(1).ExtendDropTtl(3333);
	}

	[Fact]
	public void GetFilesForZip_WhenDropNotFound_ReturnsFailure()
	{
		// Arrange
		_dropService.GetDrop(5555).Returns((DropPayload?)null);

		// Act
		var result = _orchestrator.GetFilesForZip(5555);

		// Assert
		Assert.False(result.Success);
		Assert.Equal("Invalid PIN or payload has expired.", result.Message);
	}

	[Fact]
	public void GetFilesForZip_WhenFilesExist_FiltersMissingAndExtendsTtl()
	{
		// Arrange
		var validFile = new FileMetadata { Id = "file-1", OriginalName = "report.docx" };
		var deletedFile = new FileMetadata { Id = "file-2", OriginalName = "ghost.png" };
		var payload = new DropPayload
		{
			Pin = 6666,
			Files = new List<FileMetadata> { validFile, deletedFile }
		};

		_dropService.GetDrop(6666).Returns(payload);
		_dropService.PayloadFileExists("file-1").Returns(true);
		_dropService.PayloadFileExists("file-2").Returns(false);
		_dropService.GetPhysicalFilePath("file-1").Returns("/storage/drops/file-1");

		// Act
		var result = _orchestrator.GetFilesForZip(6666);

		// Assert
		Assert.True(result.Success);
		Assert.NotNull(result.Files);
		var singleFile = Assert.Single(result.Files);
		Assert.Equal("/storage/drops/file-1", singleFile.PhysicalPath);
		Assert.Equal("report.docx", singleFile.OriginalName);
		_dropService.Received(1).ExtendDropTtl(6666);
	}

	[Fact]
	public void BurnFile_DelegatesToDropService()
	{
		// Arrange
		_dropService.DeleteFile(7777, "file-xyz").Returns(true);

		// Act
		var result = _orchestrator.BurnFile(7777, "file-xyz");

		// Assert
		Assert.True(result);
		_dropService.Received(1).DeleteFile(7777, "file-xyz");
	}

	[Fact]
	public void CancelDrop_DelegatesToDropService()
	{
		// Arrange
		_dropService.DeleteDrop(8888, "burn-token-123").Returns(true);

		// Act
		var result = _orchestrator.CancelDrop(8888, "burn-token-123");

		// Assert
		Assert.True(result);
		_dropService.Received(1).DeleteDrop(8888, "burn-token-123");
	}
}
