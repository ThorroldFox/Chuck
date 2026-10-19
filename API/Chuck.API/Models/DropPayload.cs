namespace Chuck.API.Models;

/**
 * <summary>
 * Core domain model representing an active drop in volatile memory and on-disk JSON sidecars.
 * </summary>
 */
public class DropPayload
{
	/**
     * <summary>
     * The unique 4-digit numeric PIN used by recipients to retrieve the drop.
     * </summary>
     */
	public int Pin { get; set; }

	/**
     * <summary>
     * A cryptographically secure 128-bit hex token granting the sender pre-retrieval revocation authority.
     * </summary>
     */
	public string BurnToken { get; set; } = string.Empty;

	/**
     * <summary>
     * Optional plaintext snippet or message attached to the drop.
     * </summary>
     */
	public string TextPayload { get; set; } = string.Empty;

	/**
     * <summary>
     * Collection of metadata descriptors for all binary files attached to this drop.
     * </summary>
     */
	public List<FileMetadata> Files { get; set; } = [];

	/**
     * <summary>
     * Count of failed retrieval attempts against this PIN, used for rate limiting and brute-force mitigation.
     * </summary>
     */
	public int FailedAttempts { get; set; } = 0;

	/**
     * <summary>
     * Exact UTC timestamp when the drop expires and becomes eligible for automatic eviction/shredding.
     * </summary>
     */
	public DateTime ExpiresAt { get; set; }
}
