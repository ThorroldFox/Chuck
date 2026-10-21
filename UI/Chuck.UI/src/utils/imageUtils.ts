/**
 * Raster image MIME types that can be safely previewed inline and re-encoded to PNG for the clipboard.
 * SVG is deliberately excluded: it can embed active content and has no intrinsic raster dimensions for canvas conversion.
 */
const PREVIEWABLE_IMAGE_TYPES = new Set([
	"image/png",
	"image/jpeg",
	"image/gif",
	"image/webp",
	"image/bmp",
	"image/avif",
]);

/**
 * Largest image (in bytes) that Chuck will fetch into browser memory for previewing or copying.
 * Larger images remain downloadable, but are never silently pulled into RAM by a preview.
 */
export const MAX_PREVIEW_BYTES = 25 * 1024 * 1024;

/**
 * Determines whether a retrieved file is a raster image small enough to preview and copy in the browser.
 *
 * @param contentType - The MIME type reported for the file.
 * @param sizeBytes - The file size in bytes.
 * @returns True if the file qualifies for inline preview and clipboard copy.
 */
export const isPreviewableImage = (
	contentType: string | undefined,
	sizeBytes: number,
): boolean => {
	if (!contentType) return false;
	const baseType = contentType.split(";")[0].trim().toLowerCase();
	return (
		PREVIEWABLE_IMAGE_TYPES.has(baseType) &&
		sizeBytes > 0 &&
		sizeBytes <= MAX_PREVIEW_BYTES
	);
};

/**
 * Determines whether the browser can write images to the system clipboard.
 * The async Clipboard API is only exposed in secure contexts (HTTPS or localhost), so plain-HTTP LAN deployments return false.
 *
 * @returns True if "Copy Image" can be offered.
 */
export const canCopyImageToClipboard = (): boolean =>
	typeof ClipboardItem !== "undefined" &&
	typeof navigator !== "undefined" &&
	typeof navigator.clipboard?.write === "function";

/**
 * Re-encodes an image blob as PNG, the only image format every browser permits on the clipboard.
 * PNG blobs are returned untouched.
 *
 * @param blob - The source image blob.
 * @returns A PNG blob.
 */
export const convertBlobToPng = async (blob: Blob): Promise<Blob> => {
	if (blob.type === "image/png") return blob;

	const bitmap = await createImageBitmap(blob);
	try {
		const canvas = document.createElement("canvas");
		canvas.width = bitmap.width;
		canvas.height = bitmap.height;
		const context = canvas.getContext("2d");
		if (!context) throw new Error("Canvas is not available.");
		context.drawImage(bitmap, 0, 0);

		return await new Promise<Blob>((resolve, reject) => {
			canvas.toBlob(
				(result) =>
					result
						? resolve(result)
						: reject(new Error("PNG conversion failed.")),
				"image/png",
			);
		});
	} finally {
		bitmap.close();
	}
};

/**
 * Writes an image to the system clipboard as PNG.
 * The conversion promise is handed to ClipboardItem directly so Safari keeps the user-gesture activation alive while it resolves.
 *
 * @param loadBlob - Resolves with the image blob (fetched lazily and cached by the caller).
 */
export const copyImageToClipboard = async (
	loadBlob: () => Promise<Blob>,
): Promise<void> => {
	const pngPromise = loadBlob().then(convertBlobToPng);
	await navigator.clipboard.write([
		new ClipboardItem({ "image/png": pngPromise }),
	]);
};
