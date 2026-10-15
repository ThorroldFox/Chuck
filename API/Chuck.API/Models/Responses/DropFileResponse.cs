namespace Chuck.API.Models.Responses;

/**
 * <summary>
 * Descriptor for an individual file attached to a retrieved drop, including dynamic download and burn URLs.
 * </summary>
 */
public class DropFileResponse
{
	/**
     * <summary>
     * Unique identifier GUID for the file.
     * </summary>
     */
	public string Id { get; set; } = string.Empty;

	/**
     * <summary>
     * Original client filename displayed in the UI and used during download.
     * </summary>
     */
	public string OriginalName { get; set; } = string.Empty;

	/**
     * <summary>
     * File size in bytes.
     * </summary>
     */
	public long SizeBytes { get; set; }

	/**
     * <summary>
     * MIME media type of the file.
     * </summary>
     */
	public string ContentType { get; set; } = string.Empty;

	/**
     * <summary>
     * Relative API endpoint for downloading this individual file stream.
     * </summary>
     */
	public string DownloadUrl { get; set; } = string.Empty;

	/**
     * <summary>
     * Relative API endpoint for immediately burning this individual file.
     * </summary>
     */
	public string BurnUrl { get; set; } = string.Empty;
}
