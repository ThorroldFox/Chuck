import { describe, it, expect } from "vitest";
import { getFileCategory, getFileIcon } from "../utils/fileUtils";

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
});
