namespace Chuck.API.Models.Results;

/**
 * <summary>
 * Classifies why an inbound drop upload was rejected so the controller can map the failure to the correct HTTP status code.
 * </summary>
 */
public enum UploadFailureReason
{
	/**
	 * <summary>
	 * The upload did not fail.
	 * </summary>
	 */
	None = 0,

	/**
	 * <summary>
	 * The request was invalid (empty payload, oversized text, quota breach, malware detection, etc.) and maps to HTTP 400.
	 * </summary>
	 */
	InvalidRequest = 1,

	/**
	 * <summary>
	 * The host does not have enough free disk space to safely stage the payload and maps to HTTP 507.
	 * </summary>
	 */
	InsufficientStorage = 2
}
