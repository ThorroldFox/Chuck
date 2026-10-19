/**
 * Formats a raw byte count into a human-readable string with unit suffixes (Bytes, KB, MB, GB, TB).
 *
 * @param bytes - Numeric byte count to format.
 * @param decimals - Number of decimal places to preserve (defaults to 2).
 * @returns Human-readable formatted byte string.
 */
export const formatBytes = (bytes: number, decimals = 2): string => {
	if (!+bytes || bytes < 0) return "0 Bytes";
	const k = 1024;
	const dm = decimals < 0 ? 0 : decimals;
	const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

/**
 * Formats a remaining duration in seconds into a human-readable countdown string (e.g. "09:42" or "23h 59m 42s").
 *
 * @param remainingSeconds - Remaining seconds until expiration.
 * @returns Formatted countdown string.
 */
export const formatCountdown = (remainingSeconds: number): string => {
	const clamped = Math.max(0, Math.floor(remainingSeconds));
	const hours = Math.floor(clamped / 3600);
	const minutes = Math.floor((clamped % 3600) / 60);
	const seconds = clamped % 60;

	const paddedMinutes = String(minutes).padStart(2, "0");
	const paddedSeconds = String(seconds).padStart(2, "0");

	if (hours > 0) {
		return `${hours}h ${paddedMinutes}m ${paddedSeconds}s`;
	}

	return `${paddedMinutes}:${paddedSeconds}`;
};

