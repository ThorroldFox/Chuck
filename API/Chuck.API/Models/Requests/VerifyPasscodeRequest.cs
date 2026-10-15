namespace Chuck.API.Models.Requests;

/**
 * <summary>
 * Request payload for verifying an instance access passcode.
 * </summary>
 */
public class VerifyPasscodeRequest
{
	/**
	 * <summary>
	 * The candidate passcode provided by the client.
	 * </summary>
	 */
	public string Passcode { get; set; } = string.Empty;
}
