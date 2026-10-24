namespace Chuck.API.Models.Results;

/**
 * <summary>
 * Encapsulates the outcome of querying the status of an active or recently burnt drop.
 * </summary>
 */
public sealed class DropStatusResult
{
	/**
	 * <summary>
	 * Indicates whether the status query succeeded (valid PIN and token).
	 * </summary>
	 */
	public bool Success { get; }

	/**
	 * <summary>
	 * The current lifecycle status of the drop (e.g. "active", "burnt").
	 * </summary>
	 */
	public string Status { get; }

	/**
	 * <summary>
	 * Indicates whether a recipient has retrieved or inspected the drop metadata.
	 * </summary>
	 */
	public bool IsRetrieved { get; }

	/**
	 * <summary>
	 * Diagnostic or outcome message.
	 * </summary>
	 */
	public string Message { get; }

	private DropStatusResult(bool success, string status, bool isRetrieved, string message)
	{
		Success = success;
		Status = status;
		IsRetrieved = isRetrieved;
		Message = message;
	}

	/**
	 * <summary>
	 * Creates a successful status result.
	 * </summary>
	 * <param name="status">The current lifecycle status (e.g. "active", "burnt").</param>
	 * <param name="isRetrieved">Whether the drop has been inspected by a recipient.</param>
	 * <returns>A populated successful <see cref="DropStatusResult"/>.</returns>
	 */
	public static DropStatusResult Succeeded(string status, bool isRetrieved) =>
		new(true, status, isRetrieved, "Success");

	/**
	 * <summary>
	 * Creates a failed status result when a drop is not found or the burn token is invalid.
	 * </summary>
	 * <param name="message">The failure explanation.</param>
	 * <returns>A populated failure <see cref="DropStatusResult"/>.</returns>
	 */
	public static DropStatusResult Failed(string message = "Drop not found or invalid burn token.") =>
		new(false, string.Empty, false, message);
}
