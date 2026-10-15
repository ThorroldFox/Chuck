import type { ReactElement } from "react";
import ImageIcon from "@mui/icons-material/Image";
import VideoFileIcon from "@mui/icons-material/VideoFile";
import AudioFileIcon from "@mui/icons-material/AudioFile";
import FolderZipIcon from "@mui/icons-material/FolderZip";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";

export type FileCategory = "image" | "video" | "audio" | "archive" | "document";

/**
 * Categorises a MIME content type into a high-level file category.
 *
 * @param contentType - MIME string (e.g. "image/png", "application/zip").
 * @returns The resolved FileCategory.
 */
export const getFileCategory = (contentType: string): FileCategory => {
	const lower = (contentType || "").toLowerCase();
	if (lower.startsWith("image/")) return "image";
	if (lower.startsWith("video/")) return "video";
	if (lower.startsWith("audio/")) return "audio";
	if (
		lower.includes("zip") ||
		lower.includes("rar") ||
		lower.includes("7z") ||
		lower.includes("tar") ||
		lower.includes("compressed") ||
		lower.includes("archive")
	) {
		return "archive";
	}
	return "document";
};

/**
 * Resolves the appropriate Material UI icon component based on the MIME type.
 *
 * @param contentType - MIME string.
 * @returns ReactElement representing the category icon.
 */
export const getFileIcon = (contentType: string): ReactElement => {
	const category = getFileCategory(contentType);
	switch (category) {
		case "image":
			return <ImageIcon />;
		case "video":
			return <VideoFileIcon />;
		case "audio":
			return <AudioFileIcon />;
		case "archive":
			return <FolderZipIcon />;
		default:
			return <InsertDriveFileIcon />;
	}
};
