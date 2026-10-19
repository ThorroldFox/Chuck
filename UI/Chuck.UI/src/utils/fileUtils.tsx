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

const readEntryFiles = async (entry: FileSystemEntry): Promise<File[]> => {
	if (entry.isFile) {
		const fileEntry = entry as FileSystemFileEntry;
		return new Promise<File[]>((resolve) => {
			fileEntry.file(
				(file) => resolve([file]),
				() => resolve([]),
			);
		});
	}

	if (entry.isDirectory) {
		const dirEntry = entry as FileSystemDirectoryEntry;
		const reader = dirEntry.createReader();
		const childEntries: FileSystemEntry[] = [];

		const readBatch = (): Promise<FileSystemEntry[]> =>
			new Promise((resolve) => {
				reader.readEntries(
					(entries) => resolve(entries),
					() => resolve([]),
				);
			});

		let batch = await readBatch();
		while (batch.length > 0) {
			childEntries.push(...batch);
			batch = await readBatch();
		}

		const nestedFiles = await Promise.all(
			childEntries.map((child) => readEntryFiles(child)),
		);
		return nestedFiles.flat();
	}

	return [];
};

/**
 * Extracts all files from a DragEvent DataTransfer payload, recursively traversing any dropped directories.
 * Falls back to standard DataTransfer.files when FileSystemEntry APIs are unavailable.
 *
 * @param dataTransfer - The DataTransfer object from a drag-and-drop event.
 * @returns A flat array of extracted File objects.
 */
export const extractDroppedFiles = async (
	dataTransfer: DataTransfer,
): Promise<File[]> => {
	const fallbackFiles = dataTransfer.files
		? Array.from(dataTransfer.files)
		: [];

	if (!dataTransfer.items || dataTransfer.items.length === 0) {
		return fallbackFiles;
	}

	const entries: FileSystemEntry[] = [];
	const directFiles: File[] = [];

	for (let i = 0; i < dataTransfer.items.length; i++) {
		const item = dataTransfer.items[i];
		if (item.kind !== "file") continue;

		const entry =
			typeof item.webkitGetAsEntry === "function"
				? item.webkitGetAsEntry()
				: null;

		if (entry) {
			entries.push(entry);
		} else {
			const file = item.getAsFile?.();
			if (file) directFiles.push(file);
		}
	}

	if (entries.length === 0) {
		return directFiles.length > 0 ? directFiles : fallbackFiles;
	}

	const extractedGroups = await Promise.all(
		entries.map((entry) => readEntryFiles(entry)),
	);
	return [...extractedGroups.flat(), ...directFiles];
};

