import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
	RetrievedFileRow,
	type RetrievedFileItem,
} from "../components/RetrievedFileRow";
import { savePasscode, clearStoredPasscode } from "../utils/passcodeUtils";

describe("RetrievedFileRow", () => {
	const sampleFile: RetrievedFileItem = {
		id: "test-guid-1",
		originalName: "confidential-manifest.pdf",
		sizeBytes: 1572864, // 1.5 MB
		contentType: "application/pdf",
		downloadUrl: "/api/v1/drops/1234/files/test-guid-1",
		burnUrl: "/api/v1/drops/1234/files/test-guid-1",
	};

	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it("renders the file name and human-readable byte size", () => {
		const onBurnt = vi.fn();
		render(<RetrievedFileRow file={sampleFile} onBurnt={onBurnt} />);

		expect(
			screen.getByText("confidential-manifest.pdf"),
		).toBeInTheDocument();
		expect(screen.getByText("1.5 MB")).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /download/i }),
		).toBeInTheDocument();
	});

	it("transitions to 'Again' and 'Burn' buttons upon clicking Download", async () => {
		const user = userEvent.setup();
		const onBurnt = vi.fn();

		// Mock anchor click behaviour
		const appendChildSpy = vi.spyOn(document.body, "appendChild");
		const removeChildSpy = vi.spyOn(document.body, "removeChild");

		render(<RetrievedFileRow file={sampleFile} onBurnt={onBurnt} />);

		const downloadButton = screen.getByRole("button", {
			name: /download/i,
		});
		await user.click(downloadButton);

		// Verified download anchor was mounted and unmounted
		expect(appendChildSpy).toHaveBeenCalled();
		expect(removeChildSpy).toHaveBeenCalled();

		// Split actions must now be visible
		expect(
			screen.getByRole("button", { name: /again/i }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /burn/i }),
		).toBeInTheDocument();
	});

	it("calls API DELETE and invokes onBurnt when Burn is clicked", async () => {
		const user = userEvent.setup();
		const onBurnt = vi.fn();

		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
		} as Response);

		render(<RetrievedFileRow file={sampleFile} onBurnt={onBurnt} />);

		// Trigger download first to expose the Burn action
		await user.click(screen.getByRole("button", { name: /download/i }));

		const burnButton = screen.getByRole("button", { name: /burn/i });
		await user.click(burnButton);

		expect(globalThis.fetch).toHaveBeenCalledWith(
			sampleFile.burnUrl,
			expect.objectContaining({
				method: "DELETE",
			}),
		);
		expect(onBurnt).toHaveBeenCalledWith("test-guid-1");
	});

	it("displays an error message when file burning fails", async () => {
		const user = userEvent.setup();
		const onBurnt = vi.fn();

		globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network Error"));

		render(<RetrievedFileRow file={sampleFile} onBurnt={onBurnt} />);

		// Trigger download first to expose the Burn action
		await user.click(screen.getByRole("button", { name: /download/i }));

		const burnButton = screen.getByRole("button", { name: /burn/i });
		await user.click(burnButton);

		expect(screen.getByText("Failed to burn")).toBeInTheDocument();
		expect(onBurnt).not.toHaveBeenCalled();
	});

	describe("image preview and copy", () => {
		const imageFile: RetrievedFileItem = {
			id: "img-guid-1",
			originalName: "screenshot.png",
			sizeBytes: 204800,
			contentType: "image/png",
			downloadUrl: "/api/v1/drops/4321/files/img-guid-1",
			burnUrl: "/api/v1/drops/4321/files/img-guid-1",
		};

		const originalCreateObjectURL = URL.createObjectURL;
		const originalRevokeObjectURL = URL.revokeObjectURL;
		const originalClipboard = Object.getOwnPropertyDescriptor(
			navigator,
			"clipboard",
		);

		beforeEach(() => {
			URL.createObjectURL = vi.fn(() => "blob:mock-preview-url");
			URL.revokeObjectURL = vi.fn();
		});

		afterEach(() => {
			URL.createObjectURL = originalCreateObjectURL;
			URL.revokeObjectURL = originalRevokeObjectURL;
			vi.unstubAllGlobals();
			if (originalClipboard) {
				Object.defineProperty(navigator, "clipboard", originalClipboard);
			} else {
				delete (navigator as any).clipboard;
			}
		});

		const mockImageFetch = () => {
			const fetchMock = vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				blob: async () => new Blob(["png-bytes"], { type: "image/png" }),
			} as unknown as Response);
			globalThis.fetch = fetchMock;
			return fetchMock;
		};

		const supportClipboardImages = () => {
			const write = vi.fn().mockResolvedValue(undefined);
			vi.stubGlobal("ClipboardItem", class {});
			Object.defineProperty(navigator, "clipboard", {
				value: { write },
				configurable: true,
			});
			return write;
		};

		it("offers no preview or copy actions for non-image files", () => {
			render(<RetrievedFileRow file={sampleFile} onBurnt={vi.fn()} />);

			expect(
				screen.queryByRole("button", {
					name: "Preview image",
					hidden: true,
				}),
			).not.toBeInTheDocument();
			expect(
				screen.queryByRole("button", {
					name: "Copy image",
					hidden: true,
				}),
			).not.toBeInTheDocument();
		});

		it("offers no preview for SVG or oversized images", () => {
			const { rerender } = render(
				<RetrievedFileRow
					file={{
						...imageFile,
						contentType: "image/svg+xml",
					}}
					onBurnt={vi.fn()}
				/>,
			);
			expect(
				screen.queryByRole("button", {
					name: "Preview image",
					hidden: true,
				}),
			).not.toBeInTheDocument();

			rerender(
				<RetrievedFileRow
					file={{
						...imageFile,
						sizeBytes: 26 * 1024 * 1024,
					}}
					onBurnt={vi.fn()}
				/>,
			);
			expect(
				screen.queryByRole("button", {
					name: "Preview image",
					hidden: true,
				}),
			).not.toBeInTheDocument();
		});

		it("shows Preview for images but hides Copy when the browser cannot write images to the clipboard", () => {
			vi.stubGlobal("ClipboardItem", undefined);

			render(<RetrievedFileRow file={imageFile} onBurnt={vi.fn()} />);

			expect(
				screen.getByRole("button", {
					name: "Preview image",
					hidden: true,
				}),
			).toBeInTheDocument();
			expect(
				screen.queryByRole("button", {
					name: "Copy image",
					hidden: true,
				}),
			).not.toBeInTheDocument();
		});

		it("fetches the image only when Preview is opened and renders it from an object URL", async () => {
			const user = userEvent.setup();
			const fetchMock = mockImageFetch();

			render(<RetrievedFileRow file={imageFile} onBurnt={vi.fn()} />);
			expect(fetchMock).not.toHaveBeenCalled();

			await user.click(
				screen.getByRole("button", {
					name: "Preview image",
					hidden: true,
				}),
			);

			const dialog = await screen.findByRole("dialog");
			const preview = await within(dialog).findByRole("img", {
				name: "screenshot.png",
			});
			expect(preview).toHaveAttribute("src", "blob:mock-preview-url");
			expect(fetchMock).toHaveBeenCalledTimes(1);
			expect(fetchMock).toHaveBeenCalledWith(
				imageFile.downloadUrl,
				expect.objectContaining({ headers: expect.any(Object) }),
			);
		});

		it("revokes the object URL when the preview closes", async () => {
			const user = userEvent.setup();
			mockImageFetch();

			render(<RetrievedFileRow file={imageFile} onBurnt={vi.fn()} />);
			await user.click(
				screen.getByRole("button", {
					name: "Preview image",
					hidden: true,
				}),
			);
			const dialog = await screen.findByRole("dialog");
			await within(dialog).findByRole("img", { name: "screenshot.png" });

			await user.click(
				within(dialog).getByRole("button", { name: "Close" }),
			);

			await waitFor(() => {
				expect(URL.revokeObjectURL).toHaveBeenCalledWith(
					"blob:mock-preview-url",
				);
			});
		});

		it("copies the previewed image to the clipboard and reuses the already-fetched image", async () => {
			const user = userEvent.setup();
			const fetchMock = mockImageFetch();
			const write = supportClipboardImages();

			render(<RetrievedFileRow file={imageFile} onBurnt={vi.fn()} />);
			await user.click(
				screen.getByRole("button", {
					name: "Preview image",
					hidden: true,
				}),
			);
			const dialog = await screen.findByRole("dialog");
			await within(dialog).findByRole("img", { name: "screenshot.png" });

			await user.click(
				within(dialog).getByRole("button", { name: "Copy Image" }),
			);

			await waitFor(() => {
				expect(write).toHaveBeenCalledTimes(1);
			});
			expect(
				await within(dialog).findByRole("button", { name: "Copied!" }),
			).toBeInTheDocument();
			expect(fetchMock).toHaveBeenCalledTimes(1);
		});

		it("copies straight from the row without opening the preview", async () => {
			const user = userEvent.setup();
			const fetchMock = mockImageFetch();
			const write = supportClipboardImages();

			render(<RetrievedFileRow file={imageFile} onBurnt={vi.fn()} />);
			await user.click(
				screen.getByRole("button", { name: "Copy image", hidden: true }),
			);

			await waitFor(() => {
				expect(write).toHaveBeenCalledTimes(1);
			});
			expect(fetchMock).toHaveBeenCalledTimes(1);
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		});

		it("sends the stored instance passcode as a header, never in the URL", async () => {
			const user = userEvent.setup();
			savePasscode("Secret123", false);
			const fetchMock = mockImageFetch();

			try {
				render(<RetrievedFileRow file={imageFile} onBurnt={vi.fn()} />);
				await user.click(
					screen.getByRole("button", {
						name: "Preview image",
						hidden: true,
					}),
				);
				await screen.findByRole("dialog");

				await waitFor(() => expect(fetchMock).toHaveBeenCalled());
				const [url, init] = fetchMock.mock.calls[0];
				expect(url).toBe(imageFile.downloadUrl);
				expect(init.headers["X-Instance-Passcode"]).toBe("Secret123");
			} finally {
				clearStoredPasscode();
			}
		});

		it("shows an error when the image cannot be loaded", async () => {
			const user = userEvent.setup();
			globalThis.fetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 404,
			} as Response);

			render(<RetrievedFileRow file={imageFile} onBurnt={vi.fn()} />);
			await user.click(
				screen.getByRole("button", {
					name: "Preview image",
					hidden: true,
				}),
			);

			expect(
				await screen.findByText(/could not be loaded/i),
			).toBeInTheDocument();
		});

		it("shows an error when the clipboard write is rejected", async () => {
			const user = userEvent.setup();
			mockImageFetch();
			const write = supportClipboardImages();
			write.mockRejectedValue(new Error("NotAllowedError"));

			render(<RetrievedFileRow file={imageFile} onBurnt={vi.fn()} />);
			await user.click(
				screen.getByRole("button", {
					name: "Preview image",
					hidden: true,
				}),
			);
			const dialog = await screen.findByRole("dialog");
			await within(dialog).findByRole("img", { name: "screenshot.png" });

			await user.click(
				within(dialog).getByRole("button", { name: "Copy Image" }),
			);

			expect(
				await within(dialog).findByRole("alert"),
			).toHaveTextContent(/could not copy the image/i);
		});
	});

	describe("text file preview", () => {
		const textFile: RetrievedFileItem = {
			id: "txt-guid-1",
			originalName: "application.log",
			sizeBytes: 1024,
			contentType: "text/plain",
			downloadUrl: "/api/v1/drops/9999/files/txt-guid-1",
			burnUrl: "/api/v1/drops/9999/files/txt-guid-1",
		};

		it("renders preview button for text files and opens TextPreviewDialog", async () => {
			const user = userEvent.setup();
			const onBurnt = vi.fn();

			globalThis.fetch = vi.fn().mockResolvedValue({
				ok: true,
				text: async () => "2026-10-22 [INFO] Server started successfully",
			} as Response);

			render(<RetrievedFileRow file={textFile} onBurnt={onBurnt} />);

			const previewBtn = screen.getByRole("button", {
				name: "Preview file",
				hidden: true,
			});
			expect(previewBtn).toBeInTheDocument();

			await user.click(previewBtn);

			const dialog = await screen.findByRole("dialog");
			expect(
				within(dialog).getByText("application.log"),
			).toBeInTheDocument();
			expect(
				await within(dialog).findByText(
					"2026-10-22 [INFO] Server started successfully",
				),
			).toBeInTheDocument();
		});
	});
});
