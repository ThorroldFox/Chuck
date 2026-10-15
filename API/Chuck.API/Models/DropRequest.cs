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
}
