using Chuck.API.Models;
using Chuck.API.Models.Results;

namespace Chuck.API.Orchestrators;

/**
 * <summary>
 * Coordinates business workflows, quota enforcement, and payload transformation across Chuck drops.
 * </summary>
 */
public interface IDropsOrchestrator
{
	/**
	 * <summary>
	 * Processes an inbound drop creation request, verifying quotas and delegating storage persistence.
	 * </summary>
	 */
	Task<ProcessUploadResult> ProcessUploadAsync(DropRequest request);

	/**
	 * <summary>
	 * Resolves drop metadata for recipient inspection.
	 * </summary>
	 */
	DropSummaryResult GetDropSummary(int pin);

	/**
	 * <summary>
	 * Queries the current lifecycle and retrieval status of a drop using its PIN and uploader burn token.
	 * </summary>
	 */
	DropStatusResult GetDropStatus(int pin, string token);

	/**
	 * <summary>
	 * Resolves an individual physical file for chunked HTTP range streaming.
	 * </summary>
	 */
	FileDownloadResult GetFileForDownload(int pin, string fileId);

	/**
	 * <summary>
	 * Resolves all attached physical files for on-the-fly streaming ZIP archive packaging.
	 * </summary>
	 */
	ZipDownloadResult GetFilesForZip(int pin);

	/**
	 * <summary>
	 * Requests immediate shredding of an individual attached file from an active drop.
	 * </summary>
	 */
	bool BurnFile(int pin, string fileId);

	/**
	 * <summary>
	 * Requests atomic cancellation or incineration of an entire drop.
	 * </summary>
	 */
	bool CancelDrop(int pin, string? token);
}
