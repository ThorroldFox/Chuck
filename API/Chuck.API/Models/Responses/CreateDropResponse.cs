namespace Chuck.API.Models.Responses;

/**
 * <summary>
 * Response payload returned upon successful creation of an ephemeral drop.
 * </summary>
 */
public class CreateDropResponse
{
	/**
     * <summary>
     * The generated 4-digit numeric PIN for collecting the drop.
     * </summary>
     */
	public int Pin { get; set; }

	/**
     * <summary>
     * Time-to-live duration in minutes before the drop is automatically evicted and shredded.
     * </summary>
     */
	public int? ExpiresInMinutes { get; set; }

	/**
     * <summary>
     * Exact UTC timestamp when the drop expires and becomes eligible for automatic eviction.
     * </summary>
     */
	public DateTime? ExpiresAt { get; set; }

	/**
     * <summary>
     * Cryptographic 128-bit hex token granting the sender pre-retrieval cancellation authority.
     * </summary>
     */
	public string? BurnToken { get; set; }
}

