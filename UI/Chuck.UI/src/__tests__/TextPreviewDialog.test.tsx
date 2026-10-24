import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TextPreviewDialog } from "../components/TextPreviewDialog";

describe("TextPreviewDialog", () => {
	it("renders loading spinner and then text content upon load completion", async () => {
		const loadText = vi.fn().mockResolvedValue("Hello Chuck text preview!");
		const onClose = vi.fn();

		render(
			<TextPreviewDialog
				open={true}
				fileName="notes.txt"
				loadText={loadText}
				onClose={onClose}
			/>,
		);

		expect(screen.getByText("notes.txt")).toBeInTheDocument();
		await waitFor(() => {
			expect(
				screen.getByText("Hello Chuck text preview!"),
			).toBeInTheDocument();
		});
		expect(loadText).toHaveBeenCalledTimes(1);
	});

	it("shows error alert when loading fails", async () => {
		const loadText = vi.fn().mockRejectedValue(new Error("Network failed"));
		const onClose = vi.fn();

		render(
			<TextPreviewDialog
				open={true}
				fileName="server.log"
				loadText={loadText}
				onClose={onClose}
			/>,
		);

		await waitFor(() => {
			expect(
				screen.getByText(/This file could not be loaded/i),
			).toBeInTheDocument();
		});
	});

	it("copies text content to clipboard when Copy Text is clicked", async () => {
		const user = userEvent.setup();
		const loadText = vi.fn().mockResolvedValue("Console log line 1\nLine 2");
		const onClose = vi.fn();

		const writeTextMock = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(navigator, "clipboard", {
			value: {
				writeText: writeTextMock,
			},
			writable: true,
			configurable: true,
		});

		render(
			<TextPreviewDialog
				open={true}
				fileName="test.log"
				loadText={loadText}
				onClose={onClose}
			/>,
		);

		await waitFor(() => {
			expect(
				screen.getByText(/Console log line 1/i),
			).toBeInTheDocument();
		});

		const copyBtn = screen.getByRole("button", { name: /copy text/i });
		await user.click(copyBtn);

		expect(writeTextMock).toHaveBeenCalledWith(
			"Console log line 1\nLine 2",
		);
		expect(screen.getByText("Copied!")).toBeInTheDocument();
	});

	it("calls onClose when Close button is clicked", async () => {
		const user = userEvent.setup();
		const loadText = vi.fn().mockResolvedValue("Sample content");
		const onClose = vi.fn();

		render(
			<TextPreviewDialog
				open={true}
				fileName="readme.md"
				loadText={loadText}
				onClose={onClose}
			/>,
		);

		const closeBtn = screen.getByRole("button", { name: /close/i });
		await user.click(closeBtn);
		expect(onClose).toHaveBeenCalled();
	});
});
