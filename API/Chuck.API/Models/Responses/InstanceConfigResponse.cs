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
}
