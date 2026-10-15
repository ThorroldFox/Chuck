namespace Chuck.API.Models;

/**
 * <summary>
 * Metadata descriptor for an uploaded binary file stored on the staging disk.
 * </summary>
 */
public class FileMetadata
{
	/**
     * <summary>
     * Unique GUID representing the file on the staging filesystem, isolating internal filenames from raw client inputs.
     * </summary>
     */
	public string Id { get; set; } = string.Empty;

	/**
     * <summary>
     * Original client filename restored when downloading or packaging the file.
     * </summary>
     */
	public string OriginalName { get; set; } = string.Empty;

	/**
     * <summary>
     * Total file size in bytes.
     * </summary>
     */
	public long SizeBytes { get; set; }

	/**
     * <summary>
     * MIME media type of the file (e.g. "application/pdf", "image/png").
     * </summary>
     */
	public string ContentType { get; set; } = string.Empty;

	/**
     * <summary>
     * Tracks whether the file has been successfully retrieved by a client.
     * </summary>
     */
	public bool IsDownloaded { get; set; } = false;
}
