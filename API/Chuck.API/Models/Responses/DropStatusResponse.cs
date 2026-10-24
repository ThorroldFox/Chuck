namespace Chuck.API.Models.Responses;

/**
 * <summary>
 * Status response returned when polling the lifecycle state of an active or recently burnt drop.
 * </summary>
 */
public class DropStatusResponse
{
	/**
	 * <summary>
	 * Status indicator for the queried drop (e.g. "active", "burnt").
	 * </summary>
	 */
	public string Status { get; set; } = string.Empty;

	/**
	 * <summary>
	 * Indicates whether a recipient has retrieved or inspected the drop metadata.
	 * </summary>
	 */
	public bool IsRetrieved { get; set; }
}
