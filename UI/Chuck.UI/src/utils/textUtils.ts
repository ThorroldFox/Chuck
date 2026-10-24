const MAX_PREVIEWABLE_TEXT_BYTES = 1048576; // 1 MB cap to prevent browser thread locking

const TEXT_EXTENSIONS = new Set([
	".bash",
	".bat",
	".c",
	".cfg",
	".cmd",
	".conf",
	".cpp",
	".cs",
	".css",
	".csv",
	".diff",
	".env",
	".go",
	".h",
	".hpp",
	".htm",
	".html",
	".ini",
	".java",
	".js",
	".json",
	".jsx",
	".kt",
	".log",
	".markdown",
	".md",
	".patch",
	".php",
	".ps1",
	".py",
	".rs",
	".sass",
	".scss",
	".sh",
	".sql",
	".toml",
	".ts",
	".tsx",
	".tsv",
	".txt",
	".xml",
	".yaml",
	".yml",
	".zsh",
]);

/**
 * Determines whether a retrieved file payload qualifies for lightweight in-browser text preview.
 */
export function isPreviewableText(
	contentType: string | undefined,
	fileName: string | undefined,
	sizeBytes: number,
): boolean {
	if (sizeBytes <= 0 || sizeBytes > MAX_PREVIEWABLE_TEXT_BYTES) {
		return false;
	}

	const lowerType = (contentType || "").toLowerCase();
	if (
		lowerType.startsWith("text/") ||
		lowerType === "application/json" ||
		lowerType === "application/xml" ||
		lowerType === "application/javascript" ||
		lowerType === "application/typescript" ||
		lowerType === "application/x-sh" ||
		lowerType === "application/x-yaml" ||
		lowerType === "application/yaml" ||
		lowerType === "application/sql" ||
		lowerType === "application/toml" ||
		lowerType === "application/x-php" ||
		lowerType === "application/x-httpd-php"
	) {
		return true;
	}

	const name = (fileName || "").toLowerCase();
	const lastDot = name.lastIndexOf(".");
	if (lastDot !== -1) {
		const ext = name.substring(lastDot);
		if (TEXT_EXTENSIONS.has(ext)) {
			return true;
		}
	}

	return false;
}
