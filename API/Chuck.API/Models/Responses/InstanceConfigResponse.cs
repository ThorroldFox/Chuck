namespace Chuck.API.Models.Responses;

/**
 * <summary>
 * Details the public security configuration of the active Chuck instance.
 * </summary>
 */
public class InstanceConfigResponse
{
	/**
	 * <summary>
	 * Indicates whether the instance is protected by an access passcode.
	 * </summary>
	 */
	public bool IsPasscodeProtected { get; set; }

	/**
	 * <summary>
	 * The maximum combined size in bytes of all files permitted in a single drop, so clients can enforce and display the
	 * instance's configured limit (<c>ChuckSettings:MaxPayloadSizeBytes</c>) instead of assuming a hardcoded value.
	 * </summary>
	 */
	public long MaxPayloadSizeBytes { get; set; }
}
