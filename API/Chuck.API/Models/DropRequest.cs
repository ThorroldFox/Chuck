namespace Chuck.API.Models;

/**
 * <summary>
 * Incoming multipart/form-data request DTO for creating a new drop.
 * </summary>
 */
public class DropRequest
{
	/**
     * <summary>
     * Optional text snippet or message payload provided by the client.
     * </summary>
     */
	public string? TextPayload { get; set; }

	/**
     * <summary>
     * Collection of binary files uploaded via the multipart request stream.
     * </summary>
     */
	public IFormFileCollection? Files { get; set; }

	/**
     * <summary>
     * Optional requested time-to-live duration in minutes for the drop (defaults to 10 minutes; bounded between 1 and 30 minutes for anonymous drops).
     * </summary>
     */
	public int? ExpiryMinutes { get; set; }
}

