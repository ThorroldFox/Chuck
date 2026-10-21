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
	 * The generated 4-digit retrieval PIN allocated to this drop, or <c>0</c> if creation failed.
	 * </summary>
	 */
	public int Pin { get; }

	/**
	 * <summary>
	 * The lifespan of the drop in minutes prior to automatic server eviction.
	 * </summary>
	 */
	public int? ExpiresInMinutes { get; }

	/**
	 * <summary>
	 * Exact UTC timestamp when the drop expires and becomes eligible for automatic server eviction.
	 * </summary>
	 */
	public DateTime? ExpiresAt { get; }

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

	/**
	 * <summary>
	 * Categorises the rejection reason on failure (used to select the HTTP status code), or <see cref="UploadFailureReason.None"/> on success.
	 * </summary>
	 */
	public UploadFailureReason FailureReason { get; }

	private ProcessUploadResult(bool success, int pin, int? expiresInMinutes, DateTime? expiresAt, string? burnToken, string message, UploadFailureReason failureReason)
	{
		Success = success;
		Pin = pin;
		ExpiresInMinutes = expiresInMinutes;
		ExpiresAt = expiresAt;
		BurnToken = burnToken;
		Message = message;
		FailureReason = failureReason;
	}

	/**
	 * <summary>
	 * Creates a successful upload result with the allocated PIN and cryptographic burn token.
	 * </summary>
	 * <param name="pin">The 4-digit numeric retrieval PIN.</param>
	 * <param name="burnToken">The 16-byte hex cancellation token.</param>
	 * <param name="expiresInMinutes">The duration before expiration (defaults to 10 minutes).</param>
	 * <param name="expiresAt">Optional exact UTC expiration timestamp.</param>
	 * <returns>A populated successful <see cref="ProcessUploadResult"/> instance.</returns>
	 */
	public static ProcessUploadResult Succeeded(int pin, string burnToken, int expiresInMinutes = 10, DateTime? expiresAt = null) =>
		new(true, pin, expiresInMinutes, expiresAt, burnToken, "Drop created successfully.", UploadFailureReason.None);

	/**
	 * <summary>
	 * Creates a failed upload result detailing the specific error or rejection reason.
	 * </summary>
	 * <param name="message">The failure explanation.</param>
	 * <param name="failureReason">The failure category used to select the HTTP status code (defaults to <see cref="UploadFailureReason.InvalidRequest"/>).</param>
	 * <returns>A populated failure <see cref="ProcessUploadResult"/> instance.</returns>
	 */
	public static ProcessUploadResult Failed(string message, UploadFailureReason failureReason = UploadFailureReason.InvalidRequest) =>
		new(false, 0, null, null, null, message, failureReason);
}

