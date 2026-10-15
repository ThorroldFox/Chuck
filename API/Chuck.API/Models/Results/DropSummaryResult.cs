namespace Chuck.API.Models.Results;

/**
 * <summary>
 * Encapsulates the outcome of querying drop summary metadata using a 4-digit PIN.
 * Contains the retrieved <see cref="DropPayload"/> upon success, or failure diagnostics.
 * </summary>
 */
public sealed class DropSummaryResult
{
	/**
	 * <summary>
	 * Indicates whether a valid active drop was resolved for the requested PIN.
	 * </summary>
	 */
	public bool Success { get; }

	/**
	 * <summary>
	 * The resolved active drop payload, or <c>null</c> if expired or non-existent.
	 * </summary>
	 */
	public DropPayload? Payload { get; }

	/**
	 * <summary>
	 * Informational outcome message.
	 * </summary>
	 */
	public string Message { get; }

	private DropSummaryResult(bool success, DropPayload? payload, string message)
	{
		Success = success;
		Payload = payload;
		Message = message;
	}

	/**
	 * <summary>
	 * Creates a successful query result wrapping the resolved drop payload.
	 * </summary>
	 * <param name="payload">The active drop payload retrieved from memory.</param>
	 * <returns>A populated successful <see cref="DropSummaryResult"/> instance.</returns>
	 */
	public static DropSummaryResult Succeeded(DropPayload payload) =>
		new(true, payload, "Success");

	/**
	 * <summary>
	 * Creates a failed query result when a PIN is invalid, expired, or non-existent.
	 * </summary>
	 * <param name="message">The failure explanation.</param>
	 * <returns>A populated failure <see cref="DropSummaryResult"/> instance.</returns>
	 */
	public static DropSummaryResult Failed(string message = "Invalid PIN or payload has expired.") =>
		new(false, null, message);
}
