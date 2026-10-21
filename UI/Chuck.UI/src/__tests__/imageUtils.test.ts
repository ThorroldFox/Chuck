import { describe, it, expect, vi, afterEach } from "vitest";
import {
	MAX_PREVIEW_BYTES,
	canCopyImageToClipboard,
	convertBlobToPng,
	copyImageToClipboard,
	isPreviewableImage,
} from "../utils/imageUtils";

describe("imageUtils", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe("isPreviewableImage", () => {
		it.each([
			"image/png",
			"image/jpeg",
			"image/gif",
			"image/webp",
			"image/bmp",
			"image/avif",
		])("accepts %s", (type) => {
			expect(isPreviewableImage(type, 1024)).toBe(true);
		});

		it("is case-insensitive and ignores MIME parameters", () => {
			expect(isPreviewableImage("IMAGE/PNG; charset=binary", 1024)).toBe(
				true,
			);
		});

		it.each(["image/svg+xml", "application/pdf", "text/plain", ""])(
			"rejects %s",
			(type) => {
				expect(isPreviewableImage(type, 1024)).toBe(false);
			},
		);

		it("rejects undefined content types", () => {
			expect(isPreviewableImage(undefined, 1024)).toBe(false);
		});

		it("rejects empty and oversized images", () => {
			expect(isPreviewableImage("image/png", 0)).toBe(false);
			expect(isPreviewableImage("image/png", MAX_PREVIEW_BYTES)).toBe(
				true,
			);
			expect(isPreviewableImage("image/png", MAX_PREVIEW_BYTES + 1)).toBe(
				false,
			);
		});
	});

	describe("canCopyImageToClipboard", () => {
		it("returns false when ClipboardItem is unavailable (insecure context)", () => {
			vi.stubGlobal("ClipboardItem", undefined);

			expect(canCopyImageToClipboard()).toBe(false);
		});

		it("returns true when ClipboardItem and clipboard.write exist", () => {
			vi.stubGlobal("ClipboardItem", class {});
			Object.defineProperty(navigator, "clipboard", {
				value: { write: vi.fn() },
				configurable: true,
			});

			expect(canCopyImageToClipboard()).toBe(true);
		});

		it("returns false when the clipboard API is missing", () => {
			vi.stubGlobal("ClipboardItem", class {});
			Object.defineProperty(navigator, "clipboard", {
				value: undefined,
				configurable: true,
			});

			expect(canCopyImageToClipboard()).toBe(false);
		});
	});

	describe("convertBlobToPng", () => {
		it("returns PNG blobs untouched", async () => {
			const png = new Blob(["png"], { type: "image/png" });

			expect(await convertBlobToPng(png)).toBe(png);
		});

		it("re-encodes other formats to PNG via a canvas", async () => {
			const close = vi.fn();
			const drawImage = vi.fn();
			const pngResult = new Blob(["converted"], { type: "image/png" });
			vi.stubGlobal(
				"createImageBitmap",
				vi.fn().mockResolvedValue({ width: 4, height: 3, close }),
			);
			const getContext = vi
				.spyOn(HTMLCanvasElement.prototype, "getContext")
				.mockReturnValue({ drawImage } as any);
			const toBlob = vi
				.spyOn(HTMLCanvasElement.prototype, "toBlob")
				.mockImplementation((callback) => callback(pngResult));

			try {
				const result = await convertBlobToPng(
					new Blob(["jpg"], { type: "image/jpeg" }),
				);

				expect(result).toBe(pngResult);
				expect(drawImage).toHaveBeenCalled();
				expect(toBlob).toHaveBeenCalledWith(
					expect.any(Function),
					"image/png",
				);
				expect(close).toHaveBeenCalled();
			} finally {
				getContext.mockRestore();
				toBlob.mockRestore();
			}
		});

		it("rejects and still releases the bitmap when PNG encoding fails", async () => {
			const close = vi.fn();
			vi.stubGlobal(
				"createImageBitmap",
				vi.fn().mockResolvedValue({ width: 1, height: 1, close }),
			);
			const getContext = vi
				.spyOn(HTMLCanvasElement.prototype, "getContext")
				.mockReturnValue({ drawImage: vi.fn() } as any);
			const toBlob = vi
				.spyOn(HTMLCanvasElement.prototype, "toBlob")
				.mockImplementation((callback) => callback(null));

			try {
				await expect(
					convertBlobToPng(new Blob(["x"], { type: "image/webp" })),
				).rejects.toThrow("PNG conversion failed.");
				expect(close).toHaveBeenCalled();
			} finally {
				getContext.mockRestore();
				toBlob.mockRestore();
			}
		});
	});

	describe("copyImageToClipboard", () => {
		it("writes a PNG ClipboardItem to the clipboard", async () => {
			const write = vi.fn().mockResolvedValue(undefined);
			const items: any[] = [];
			vi.stubGlobal(
				"ClipboardItem",
				class {
					constructor(data: Record<string, Promise<Blob>>) {
						items.push(data);
					}
				},
			);
			Object.defineProperty(navigator, "clipboard", {
				value: { write },
				configurable: true,
			});
			const png = new Blob(["png"], { type: "image/png" });

			await copyImageToClipboard(() => Promise.resolve(png));

			expect(write).toHaveBeenCalledTimes(1);
			expect(Object.keys(items[0])).toEqual(["image/png"]);
			expect(await items[0]["image/png"]).toBe(png);
		});

		it("propagates clipboard write failures", async () => {
			vi.stubGlobal("ClipboardItem", class {});
			Object.defineProperty(navigator, "clipboard", {
				value: { write: vi.fn().mockRejectedValue(new Error("denied")) },
				configurable: true,
			});

			await expect(
				copyImageToClipboard(() =>
					Promise.resolve(new Blob(["x"], { type: "image/png" })),
				),
			).rejects.toThrow("denied");
		});
	});
});
