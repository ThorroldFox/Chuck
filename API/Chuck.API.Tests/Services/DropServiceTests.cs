using System.Text;
using System.Text.Json;
using Chuck.API.Models;
using Chuck.API.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Time.Testing;
using nClam;
using NSubstitute;

namespace Chuck.API.Tests.Services;

public class DropServiceTests : IDisposable
{
	private readonly string _tempDirectory;
	private readonly IMemoryCache _cache;
	private readonly IConfiguration _config;
	private readonly FakeTimeProvider _timeProvider;
	private readonly DateTimeOffset _initialTime = new(2026, 10, 11, 12, 0, 0, TimeSpan.Zero);

	public DropServiceTests()
	{
		_tempDirectory = Path.Combine(Path.GetTempPath(), "ChuckTests_" + Guid.NewGuid().ToString("N"));
		Directory.CreateDirectory(_tempDirectory);

		_cache = new MemoryCache(new MemoryCacheOptions());
		_timeProvider = new FakeTimeProvider(_initialTime);

		var settings = new Dictionary<string, string?>
		{
			{ "ChuckSettings:DiskStoragePath", _tempDirectory },
			{ "ChuckSettings:EnableVirusScanning", "false" },
			{ "ChuckSettings:ClamAvHost", "localhost" },
			{ "ChuckSettings:ClamAvPort", "3310" }
		};

		_config = new ConfigurationBuilder()
			.AddInMemoryCollection(settings)
			.Build();
	}

	public void Dispose()
	{
		if (Directory.Exists(_tempDirectory))
		{
			try
			{
				Directory.Delete(_tempDirectory, recursive: true);
			}
			catch
			{
				// Ignore transient file locks during teardown
			}
		}
		_cache.Dispose();
	}

	private DropService CreateDropService(IClamClient? clamClient = null)
	{
		return new DropService(
			_cache,
			_config,
			NullLogger<DropService>.Instance,
			clamClient,
			_timeProvider);
	}

	[Fact]
	public async Task CreateDropAsync_WithTextPayload_GeneratesFourDigitPinAndWritesSidecar()
	{
		// Arrange
		var service = CreateDropService();
		var request = new DropRequest
		{
			TextPayload = "Super secure credentials"
		};

		// Act
		var (pin, burnToken) = await service.CreateDropAsync(request);

		// Assert
		Assert.NotNull(pin);
		Assert.True(int.TryParse(pin, out int numericPin));
		Assert.InRange(numericPin, 1000, 9999);
		Assert.False(string.IsNullOrWhiteSpace(burnToken));

		// Check RAM cache
		var drop = service.GetDrop(pin);
		Assert.NotNull(drop);
		Assert.Equal("Super secure credentials", drop.TextPayload);
		Assert.Equal(pin, drop.Pin);
		Assert.Equal(burnToken, drop.BurnToken);
		Assert.Equal(_initialTime.UtcDateTime.AddMinutes(10), drop.ExpiresAt);

		// Check sidecar on disk
		Assert.True(service.SidecarExists(pin));
		string sidecarPath = service.GetMetaSidecarPath(pin);
		var sidecarJson = await File.ReadAllTextAsync(sidecarPath);
		var deserialised = JsonSerializer.Deserialize<DropPayload>(sidecarJson);
		Assert.NotNull(deserialised);
		Assert.Equal(pin, deserialised.Pin);
	}

	[Fact]
	public async Task CreateDropAsync_WhenVirusDetected_DeletesFileAndThrowsException()
	{
		// Arrange
		var mockClam = Substitute.For<IClamClient>();
		var infectedResult = new ClamScanResult("/path/eicar.com: Eicar-Test-Signature FOUND");
		mockClam.ScanFileOnServerAsync(Arg.Any<string>()).Returns(infectedResult);

		var service = CreateDropService(mockClam);

		var fileBytes = Encoding.UTF8.GetBytes("EICAR-STANDARD-ANTIVIRUS-TEST-FILE!");
		using var stream = new MemoryStream(fileBytes);
		var mockFile = new FormFile(stream, 0, fileBytes.Length, "file", "eicar.com")
		{
			Headers = new HeaderDictionary()
		};

		var request = new DropRequest
		{
			Files = new FormFileCollection { mockFile }
		};

		// Act & Assert
		var ex = await Assert.ThrowsAsync<Exception>(() => service.CreateDropAsync(request));
		Assert.Contains("Malware", ex.Message);
		Assert.Contains("eicar.com", ex.Message);

		// Verify no files remain in the isolated directory
		var files = Directory.GetFiles(_tempDirectory);
		Assert.Empty(files);
	}

	[Fact]
	public async Task DeleteDrop_WithIncorrectToken_DoesNotDeleteDropOrFiles()
	{
		// Arrange
		var service = CreateDropService();
		var request = new DropRequest { TextPayload = "Do not delete me" };
		var (pin, _) = await service.CreateDropAsync(request);

		// Act
		bool deleted = service.DeleteDrop(pin, "incorrect-token");

		// Assert
		Assert.False(deleted);
		Assert.NotNull(service.GetDrop(pin));
		Assert.True(service.SidecarExists(pin));
	}

	[Fact]
	public async Task DeleteDrop_WithMatchingToken_PermanentlyPurgesDropAndSidecar()
	{
		// Arrange
		var service = CreateDropService();
		var request = new DropRequest { TextPayload = "Delete me immediately" };
		var (pin, burnToken) = await service.CreateDropAsync(request);

		// Act
		bool deleted = service.DeleteDrop(pin, burnToken);

		// Assert
		Assert.True(deleted);
		Assert.Null(service.GetDrop(pin));
		Assert.False(service.SidecarExists(pin));
	}

	[Fact]
	public async Task ExtendDropTtl_DoesNotPurgeFilesDueToEvictionGuard()
	{
		// Arrange
		var service = CreateDropService();

		var fileBytes = Encoding.UTF8.GetBytes("Persisted file payload");
		using var stream = new MemoryStream(fileBytes);
		var mockFile = new FormFile(stream, 0, fileBytes.Length, "file", "persisted.txt")
		{
			Headers = new HeaderDictionary()
		};

		var request = new DropRequest
		{
			TextPayload = "Keep this drop active",
			Files = new FormFileCollection { mockFile }
		};

		var (pin, _) = await service.CreateDropAsync(request);
		var drop = service.GetDrop(pin);
		Assert.NotNull(drop);
		string fileId = drop.Files[0].Id;

		Assert.True(service.PayloadFileExists(fileId));

		// Act: Extend TTL (replaces cache entry)
		service.ExtendDropTtl(pin);

		// Assert: File and sidecar must still exist!
		Assert.True(service.PayloadFileExists(fileId));
		Assert.True(service.SidecarExists(pin));
		var updatedDrop = service.GetDrop(pin);
		Assert.NotNull(updatedDrop);
		Assert.Equal(_initialTime.UtcDateTime.AddMinutes(1440), updatedDrop.ExpiresAt);
	}

	[Fact]
	public void ExecuteBootSweep_PurgesExpiredDropsAndRehydratesValidDrops()
	{
		// Arrange: Write one expired drop and one active drop directly to disk
		var service = CreateDropService();

		// 1. Expired drop (expired 10 minutes ago)
		string expiredPin = "1111";
		string expiredFileId = Guid.NewGuid().ToString();
		string expiredFilePath = Path.Combine(_tempDirectory, expiredFileId);
		File.WriteAllText(expiredFilePath, "expired binary content");

		var expiredPayload = new DropPayload
		{
			Pin = expiredPin,
			BurnToken = "burn1",
			TextPayload = "Expired text",
			ExpiresAt = _initialTime.UtcDateTime.AddMinutes(-10),
			Files = new List<FileMetadata>
			{
				new() { Id = expiredFileId, OriginalName = "old.txt", SizeBytes = 22 }
			}
		};
		File.WriteAllText(service.GetMetaSidecarPath(expiredPin), JsonSerializer.Serialize(expiredPayload));

		// 2. Valid active drop (expires in 8 minutes)
		string activePin = "2222";
		string activeFileId = Guid.NewGuid().ToString();
		string activeFilePath = Path.Combine(_tempDirectory, activeFileId);
		File.WriteAllText(activeFilePath, "active binary content");

		var activePayload = new DropPayload
		{
			Pin = activePin,
			BurnToken = "burn2",
			TextPayload = "Active text",
			ExpiresAt = _initialTime.UtcDateTime.AddMinutes(8),
			Files = new List<FileMetadata>
			{
				new() { Id = activeFileId, OriginalName = "active.txt", SizeBytes = 21 }
			}
		};
		File.WriteAllText(service.GetMetaSidecarPath(activePin), JsonSerializer.Serialize(activePayload));

		// 3. Orphaned binary file (no sidecar)
		string orphanedFile = Path.Combine(_tempDirectory, "orphaned-file.bin");
		File.WriteAllText(orphanedFile, "stray unindexed data");

		// Act: Run Boot Sweep
		service.ExecuteBootSweep();

		// Assert:
		// Expired drop shredded from disk
		Assert.False(File.Exists(expiredFilePath));
		Assert.False(service.SidecarExists(expiredPin));
		Assert.Null(service.GetDrop(expiredPin));

		// Orphaned file shredded
		Assert.False(File.Exists(orphanedFile));

		// Active drop preserved on disk and re-hydrated into RAM cache
		Assert.True(File.Exists(activeFilePath));
		Assert.True(service.SidecarExists(activePin));
		var rehydrated = service.GetDrop(activePin);
		Assert.NotNull(rehydrated);
		Assert.Equal("Active text", rehydrated.TextPayload);
		Assert.Single(rehydrated.Files);
		Assert.Equal(activeFileId, rehydrated.Files[0].Id);
	}
}
