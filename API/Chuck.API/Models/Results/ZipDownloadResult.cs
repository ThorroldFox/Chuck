namespace Chuck.API.Models.Results;

/**
 * <summary>
 * Encapsulates the outcome of resolving all attached files for on-the-fly streaming ZIP packaging.
 * Contains the list of verified <see cref="ZipFileEntry"/> files upon success, or failure diagnostics.
 * </summary>
 */
public sealed class ZipDownloadResult
{
	/**
	 * <summary>
	 * Indicates whether the drop was found and contained at least one physically valid file for packaging.
	 * </summary>
	 */
	public bool Success { get; }

	/**
	 * <summary>
	 * The collection of physical files verified for inclusion in the ZIP stream, or <c>null</c> on failure.
	 * </summary>
	 */
	public IReadOnlyList<ZipFileEntry>? Files { get; }

	/**
	 * <summary>
	 * Informational outcome message.
	 * </summary>
	 */
	public string Message { get; }

	private ZipDownloadResult(bool success, IReadOnlyList<ZipFileEntry>? files, string message)
	{
		Success = success;
		Files = files;
		Message = message;
	}

	/**
	 * <summary>
	 * Creates a successful ZIP packaging result with verified file entries.
	 * </summary>
	 * <param name="files">The collection of files to stream into the archive.</param>
	 * <returns>A populated successful <see cref="ZipDownloadResult"/> instance.</returns>
	 */
	public static ZipDownloadResult Succeeded(IReadOnlyList<ZipFileEntry> files) =>
		new(true, files, "Success");

	/**
	 * <summary>
	 * Creates a failed ZIP result when the drop does not exist or contains no valid physical files.
	 * </summary>
	 * <param name="message">The failure explanation.</param>
	 * <returns>A populated failure <see cref="ZipDownloadResult"/> instance.</returns>
	 */
	public static ZipDownloadResult Failed(string message) =>
		new(false, null, message);
}
