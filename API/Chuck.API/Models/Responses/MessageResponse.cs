namespace Chuck.API.Models.Responses;

/**
 * <summary>
 * Generic API message response used for error alerts, invalid requests, and operation confirmations.
 * </summary>
 */
public class MessageResponse
{
	/**
     * <summary>
     * Human-readable message detailing the outcome or failure reason of an operation.
     * </summary>
     */
	public string Message { get; set; } = string.Empty;
}
