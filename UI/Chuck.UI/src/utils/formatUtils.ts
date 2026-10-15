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
