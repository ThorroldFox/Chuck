namespace Chuck.API.Models.Results;

/**
 * <summary>
 * Encapsulates the outcome of resolving an individual physical file payload for streaming download.
 * Contains physical disk path and HTTP streaming headers upon success, or failure diagnostics.
 * </summary>
 */
public sealed class FileDownloadResult
{
	/**
	 * <summary>
	 * Indicates whether the requested file was found in the drop metadata and physically verified on disk.
	 * </summary>
	 */
	public bool Success { get; }

	/**
	 * <summary>
	 * The absolute physical filesystem path to the file on the server host, or <c>null</c> on failure.
	 * </summary>
	 */
	public string? FilePath { get; }

	/**
	 * <summary>
	 * The MIME content type of the file payload, or <c>null</c> on failure.
	 * </summary>
	 */
	public string? ContentType { get; }

	/**
	 * <summary>
	 * The original filename supplied by the uploader, or <c>null</c> on failure.
	 * </summary>
	 */
	public string? OriginalName { get; }

	/**
	 * <summary>
	 * Informational outcome message.
	 * </summary>
	 */
	public string Message { get; }

	private FileDownloadResult(bool success, string? filePath, string? contentType, string? originalName, string message)
	{
		Success = success;
		FilePath = filePath;
		ContentType = contentType;
		OriginalName = originalName;
		Message = message;
	}

	/**
	 * <summary>
	 * Creates a successful download resolution result with confirmed physical storage path and MIME metadata.
	 * </summary>
	 * <param name="filePath">The absolute path to the binary file on disk.</param>
	 * <param name="contentType">The MIME content type.</param>
	 * <param name="originalName">The original filename.</param>
	 * <returns>A populated successful <see cref="FileDownloadResult"/> instance.</returns>
	 */
	public static FileDownloadResult Succeeded(string filePath, string contentType, string originalName) =>
		new(true, filePath, contentType, originalName, "Success");

	/**
	 * <summary>
	 * Creates a failed resolution result when a drop is missing, the file is unindexed, or disk bytes are missing.
	 * </summary>
	 * <param name="message">The failure explanation.</param>
	 * <returns>A populated failure <see cref="FileDownloadResult"/> instance.</returns>
	 */
	public static FileDownloadResult Failed(string message) =>
		new(false, null, null, null, message);
}
