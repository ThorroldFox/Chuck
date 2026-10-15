namespace Chuck.API.Models.Results;

/**
 * <summary>
 * Encapsulates the outcome of processing an inbound drop upload request.
 * Contains generated security tokens (PIN, burn token) upon success, or failure diagnostics.
 * </summary>
 */
public sealed class ProcessUploadResult
{
	/**
	 * <summary>
	 * Indicates whether the upload payload passed all quota and virus checks and was successfully created.
	 * </summary>
	 */
	public bool Success { get; }

	/**
	 * <summary>
	 * The generated 4-digit retrieval PIN allocated to this drop, or <c>null</c> if creation failed.
	 * </summary>
	 */
	public string? Pin { get; }

	/**
	 * <summary>
	 * The lifespan of the drop in minutes prior to automatic server eviction.
	 * </summary>
	 */
	public int? ExpiresInMinutes { get; }

	/**
	 * <summary>
	 * The sender's cryptographic burn token used for pre-retrieval drop cancellation, or <c>null</c> on failure.
	 * </summary>
	 */
	public string? BurnToken { get; }

	/**
	 * <summary>
	 * Descriptive user-facing message detailing the outcome or specific validation/scanning failure reason.
	 * </summary>
	 */
	public string Message { get; }

	private ProcessUploadResult(bool success, string? pin, int? expiresInMinutes, string? burnToken, string message)
	{
		Success = success;
		Pin = pin;
		ExpiresInMinutes = expiresInMinutes;
		BurnToken = burnToken;
		Message = message;
	}

	/**
	 * <summary>
	 * Creates a successful upload result with the allocated PIN and cryptographic burn token.
	 * </summary>
	 * <param name="pin">The 4-digit numeric retrieval PIN.</param>
	 * <param name="burnToken">The 16-byte hex cancellation token.</param>
	 * <param name="expiresInMinutes">The duration before expiration (defaults to 10 minutes).</param>
	 * <returns>A populated successful <see cref="ProcessUploadResult"/> instance.</returns>
	 */
	public static ProcessUploadResult Succeeded(string pin, string burnToken, int expiresInMinutes = 10) =>
		new(true, pin, expiresInMinutes, burnToken, "Drop created successfully.");

	/**
	 * <summary>
	 * Creates a failed upload result detailing the specific error or rejection reason.
	 * </summary>
	 * <param name="message">The failure explanation.</param>
	 * <returns>A populated failure <see cref="ProcessUploadResult"/> instance.</returns>
	 */
	public static ProcessUploadResult Failed(string message) =>
		new(false, null, null, null, message);
}
