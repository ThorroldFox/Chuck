namespace Chuck.API.Models.Responses;

/**
 * <summary>
 * Payload metadata response returned when resolving a drop by PIN.
 * </summary>
 */
public class DropMetadataResponse
{
	/**
     * <summary>
     * Text snippet payload associated with the drop, or empty string if only files were uploaded.
     * </summary>
     */
	public string Text { get; set; } = string.Empty;

	/**
     * <summary>
     * Collection of attached file descriptors and their respective streaming/burn URLs.
     * </summary>
     */
	public IEnumerable<DropFileResponse> Files { get; set; } = [];

	/**
     * <summary>
     * Relative API endpoint for downloading all attached files as an on-the-fly ZIP archive.
     * </summary>
     */
	public string ZipUrl { get; set; } = string.Empty;

	/**
     * <summary>
     * Relative API endpoint for atomically burning the entire drop.
     * </summary>
     */
	public string BurnUrl { get; set; } = string.Empty;

	/**
     * <summary>
     * Exact UTC timestamp when the drop expires and becomes eligible for automatic eviction.
     * </summary>
     */
	public DateTime ExpiresAt { get; set; }
}

