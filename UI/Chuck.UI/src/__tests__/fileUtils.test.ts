import { describe, it, expect } from "vitest";
import {
	getFileCategory,
	getFileIcon,
	extractDroppedFiles,
} from "../utils/fileUtils";

describe("fileUtils", () => {
	describe("getFileCategory", () => {
		it("identifies image MIME types", () => {
			expect(getFileCategory("image/png")).toBe("image");
			expect(getFileCategory("image/jpeg")).toBe("image");
			expect(getFileCategory("image/svg+xml")).toBe("image");
			expect(getFileCategory("IMAGE/GIF")).toBe("image");
		});

		it("identifies video MIME types", () => {
			expect(getFileCategory("video/mp4")).toBe("video");
			expect(getFileCategory("video/webm")).toBe("video");
			expect(getFileCategory("video/quicktime")).toBe("video");
		});

		it("identifies audio MIME types", () => {
			expect(getFileCategory("audio/mpeg")).toBe("audio");
			expect(getFileCategory("audio/wav")).toBe("audio");
			expect(getFileCategory("audio/flac")).toBe("audio");
		});

		it("identifies archive MIME types and compressed formats", () => {
			expect(getFileCategory("application/zip")).toBe("archive");
			expect(getFileCategory("application/x-zip-compressed")).toBe("archive");
			expect(getFileCategory("application/x-rar-compressed")).toBe("archive");
			expect(getFileCategory("application/x-7z-compressed")).toBe("archive");
			expect(getFileCategory("application/x-tar")).toBe("archive");
		});

		it("defaults unknown or document MIME types to 'document'", () => {
			expect(getFileCategory("application/pdf")).toBe("document");
			expect(getFileCategory("text/plain")).toBe("document");
			expect(getFileCategory("application/octet-stream")).toBe("document");
			expect(getFileCategory("")).toBe("document");
		});
	});

	describe("getFileIcon", () => {
		it("returns a valid React element icon for each category", () => {
			expect(getFileIcon("image/png")).toBeDefined();
			expect(getFileIcon("video/mp4")).toBeDefined();
			expect(getFileIcon("audio/mp3")).toBeDefined();
			expect(getFileIcon("application/zip")).toBeDefined();
			expect(getFileIcon("application/pdf")).toBeDefined();
		});
	});

	describe("extractDroppedFiles", () => {
		it("falls back to dataTransfer.files when items are unavailable", async () => {
			const fileA = new File(["alpha"], "alpha.txt", {
				type: "text/plain",
			});
			const mockDataTransfer = {
				files: [fileA],
				items: undefined,
			} as unknown as DataTransfer;

			const extracted = await extractDroppedFiles(mockDataTransfer);
			expect(extracted).toEqual([fileA]);
		});

		it("recursively traverses dropped directories and multi-batch readEntries", async () => {
			const file1 = new File(["one"], "one.txt", { type: "text/plain" });
			const file2 = new File(["two"], "two.txt", { type: "text/plain" });
			const file3 = new File(["three"], "three.txt", {
				type: "text/plain",
			});

			const makeFileEntry = (file: File): FileSystemFileEntry =>
				({
					isFile: true,
					isDirectory: false,
					name: file.name,
					file: (cb: FileCallback) => cb(file),
				}) as unknown as FileSystemFileEntry;

			const nestedDirEntry: FileSystemDirectoryEntry = {
				isFile: false,
				isDirectory: true,
				name: "nested",
				createReader: () => {
					let called = false;
					return {
						readEntries: (cb: FileSystemEntriesCallback) => {
							if (!called) {
								called = true;
								cb([makeFileEntry(file3)]);
							} else {
								cb([]);
							}
						},
					} as FileSystemDirectoryReader;
				},
			} as unknown as FileSystemDirectoryEntry;

			const rootDirEntry: FileSystemDirectoryEntry = {
				isFile: false,
				isDirectory: true,
				name: "root",
				createReader: () => {
					let batchIndex = 0;
					return {
						readEntries: (cb: FileSystemEntriesCallback) => {
							batchIndex++;
							if (batchIndex === 1) {
								cb([makeFileEntry(file1)]);
							} else if (batchIndex === 2) {
								cb([makeFileEntry(file2), nestedDirEntry]);
							} else {
								cb([]);
							}
						},
					} as FileSystemDirectoryReader;
				},
			} as unknown as FileSystemDirectoryEntry;

			const mockDataTransfer = {
				files: [],
				items: [
					{
						kind: "file",
						webkitGetAsEntry: () => rootDirEntry,
					},
				],
			} as unknown as DataTransfer;

			const extracted = await extractDroppedFiles(mockDataTransfer);
			expect(extracted.map((f) => f.name)).toEqual([
				"one.txt",
				"two.txt",
				"three.txt",
			]);
		});
	});
});

