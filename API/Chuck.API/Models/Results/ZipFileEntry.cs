namespace Chuck.API.Models.Results;

/**
 * <summary>
 * Represents an individual verified physical file targeted for dynamic ZIP archive streaming.
 * Pairs the on-disk storage location with the user's original archive entry filename.
 * </summary>
 */
public sealed class ZipFileEntry
{
	/**
	 * <summary>
	 * The absolute physical path to the file stored on the server host.
	 * </summary>
	 */
	public string PhysicalPath { get; }

	/**
	 * <summary>
	 * The original filename under which this entry should be packaged within the resulting ZIP archive.
	 * </summary>
	 */
	public string OriginalName { get; }

	public ZipFileEntry(string physicalPath, string originalName)
	{
		ArgumentException.ThrowIfNullOrWhiteSpace(physicalPath);
		ArgumentException.ThrowIfNullOrWhiteSpace(originalName);

		PhysicalPath = physicalPath;
		OriginalName = originalName;
	}
}
