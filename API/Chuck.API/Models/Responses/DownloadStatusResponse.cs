namespace Chuck.API.Models.Responses;

/**
 * <summary>
 * Status response returned when polling the preparation of an in-flight ZIP stream.
 * </summary>
 */
public class DownloadStatusResponse
{
	/**
     * <summary>
     * Status indicator for the requested download token (e.g. "started").
     * </summary>
     */
	public string Status { get; set; } = string.Empty;
}
