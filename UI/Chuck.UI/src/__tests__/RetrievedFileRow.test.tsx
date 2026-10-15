import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
	RetrievedFileRow,
	type RetrievedFileItem,
} from "../components/RetrievedFileRow";

describe("RetrievedFileRow", () => {
	const sampleFile: RetrievedFileItem = {
		id: "test-guid-1",
		originalName: "confidential-manifest.pdf",
		sizeBytes: 1572864, // 1.5 MB
		contentType: "application/pdf",
		downloadUrl: "/api/drops/1234/files/test-guid-1",
		burnUrl: "/api/drops/1234/files/test-guid-1",
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

		// Split actions must now be visible per ADR-012
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
});
