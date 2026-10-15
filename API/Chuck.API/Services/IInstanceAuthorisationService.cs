namespace Chuck.API.Services;

/**
 * <summary>
 * Service interface for evaluating instance-level access passcode security.
 * </summary>
 */
public interface IInstanceAuthorisationService
{
	/**
	 * <summary>
	 * Indicates whether instance passcode protection is active on this server.
	 * </summary>
	 */
	bool IsPasscodeProtectionEnabled { get; }

	/**
	 * <summary>
	 * Verifies whether the provided candidate passcode matches any configured authorised passcodes.
	 * </summary>
	 * <param name="candidatePasscode">The passcode provided by the client.</param>
	 * <returns><c>true</c> if valid or if protection is disabled; otherwise <c>false</c>.</returns>
	 */
	bool ValidatePasscode(string? candidatePasscode);
}
