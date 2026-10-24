import { describe, it, expect } from "vitest";
import { isPreviewableText } from "../utils/textUtils";

describe("textUtils", () => {
	it("recognises text/* content types", () => {
		expect(isPreviewableText("text/plain", "notes.txt", 100)).toBe(true);
		expect(isPreviewableText("text/csv", "data.csv", 100)).toBe(true);
		expect(isPreviewableText("text/markdown", "README.md", 100)).toBe(true);
		expect(isPreviewableText("text/html", "index.html", 100)).toBe(true);
	});

	it("recognises standard code and data content types", () => {
		expect(isPreviewableText("application/json", "config.json", 100)).toBe(
			true,
		);
		expect(isPreviewableText("application/xml", "feed.xml", 100)).toBe(
			true,
		);
		expect(
			isPreviewableText("application/javascript", "script.js", 100),
		).toBe(true);
		expect(
			isPreviewableText("application/typescript", "app.ts", 100),
		).toBe(true);
		expect(isPreviewableText("application/x-sh", "build.sh", 100)).toBe(
			true,
		);
		expect(isPreviewableText("application/yaml", "deploy.yml", 100)).toBe(
			true,
		);
		expect(
			isPreviewableText("application/x-httpd-php", "index.php", 100),
		).toBe(true);
	});

	it("recognises common code and text file extensions even when contentType is octet-stream", () => {
		expect(
			isPreviewableText("application/octet-stream", "Program.cs", 500),
		).toBe(true);
		expect(
			isPreviewableText("application/octet-stream", "script.py", 500),
		).toBe(true);
		expect(
			isPreviewableText("application/octet-stream", "server.go", 500),
		).toBe(true);
		expect(
			isPreviewableText("application/octet-stream", "main.rs", 500),
		).toBe(true);
		expect(
			isPreviewableText("application/octet-stream", "docker-compose.yml", 500),
		).toBe(true);
		expect(
			isPreviewableText("application/octet-stream", ".env", 500),
		).toBe(true);
		expect(
			isPreviewableText("application/octet-stream", "query.sql", 500),
		).toBe(true);
		expect(
			isPreviewableText("application/octet-stream", "router.php", 500),
		).toBe(true);
	});

	it("rejects binary, archive, and image files", () => {
		expect(isPreviewableText("application/zip", "archive.zip", 500)).toBe(
			false,
		);
		expect(isPreviewableText("application/pdf", "doc.pdf", 500)).toBe(
			false,
		);
		expect(isPreviewableText("image/png", "screenshot.png", 500)).toBe(
			false,
		);
		expect(
			isPreviewableText("application/octet-stream", "binary.exe", 500),
		).toBe(false);
	});

	it("rejects zero-byte files and files exceeding 1 MB", () => {
		expect(isPreviewableText("text/plain", "empty.txt", 0)).toBe(false);
		expect(
			isPreviewableText("text/plain", "large.log", 1048577), // 1 MB + 1 byte
		).toBe(false);
		expect(
			isPreviewableText("text/plain", "exact.log", 1048576), // exactly 1 MB
		).toBe(true);
	});
});
