namespace Chuck.API.Models.Responses;

/**
 * <summary>
 * Returned with HTTP 403 when a client's network address is not covered by <c>ChuckSettings:AllowedNetworks</c>.
 * </summary>
 */
public class NetworkRestrictedResponse
{
	/**
	 * <summary>
	 * Stable machine-readable error code that client applications can switch on.
	 * </summary>
	 */
	public string Code { get; set; } = "network_restricted";

	/**
	 * <summary>
	 * Human-readable explanation of the rejection.
	 * </summary>
	 */
	public string Message { get; set; } = "Access to this Chuck instance is restricted by network policy.";
}
