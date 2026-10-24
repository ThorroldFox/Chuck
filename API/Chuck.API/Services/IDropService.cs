using Chuck.API.Models;

namespace Chuck.API.Services;

public interface IDropService
{
	/**
	 * <summary>
	 * The maximum combined size (in bytes) of all files permitted in a single drop, as configured via <c>ChuckSettings:MaxPayloadSizeBytes</c>.
	 * </summary>
	 */
	long MaxPayloadSizeBytes { get; }

	Task<(int Pin, string BurnToken)> CreateDropAsync(DropRequest request);
	DropPayload? GetDrop(int pin);
	string GetPhysicalFilePath(string fileId);
	bool PayloadFileExists(string fileId);
	bool SidecarExists(int pin);
	void ExtendDropTtl(int pin);
	bool DeleteFile(int pin, string fileId);
	bool DeleteDrop(int pin, string? token = null);
	bool IsDropBurnt(string token);
	bool IsDropRetrieved(int pin);
	void MarkDropRetrieved(int pin);
	void ExecuteBootSweep();
	string GetMetaSidecarPath(int pin);

	/**
	 * <summary>
	 * Determines whether staging an incoming payload would leave the storage volume with less free space than the configured
	 * reserve (<c>ChuckSettings:MinFreeDiskSpaceBytes</c>).
	 * </summary>
	 * <param name="incomingBytes">The total size in bytes of the payload about to be staged.</param>
	 * <returns><c>true</c> if the payload must be rejected (HTTP 507); otherwise <c>false</c>. Fails open if free space cannot be determined.</returns>
	 */
	bool HasInsufficientStorage(long incomingBytes);
}
