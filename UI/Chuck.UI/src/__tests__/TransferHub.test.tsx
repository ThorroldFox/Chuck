import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TransferHub } from "../components/TransferHub";

describe("TransferHub", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders DROP and RETRIEVE tabs with DROP active by default", () => {
		render(<TransferHub />);

		expect(screen.getByRole("tab", { name: /drop/i })).toBeInTheDocument();
		expect(
			screen.getByRole("tab", { name: /retrieve/i }),
		).toBeInTheDocument();
		expect(
			screen.getByPlaceholderText(/paste text here/i),
		).toBeInTheDocument();
	});

	it("updates the text snippet when typed into the DROP memo area", async () => {
		const user = userEvent.setup();
		render(<TransferHub />);

		const memoInput = screen.getByPlaceholderText(/paste text here/i);
		await user.type(memoInput, "Confidential rendezvous notes");

		expect(memoInput).toHaveValue("Confidential rendezvous notes");
	});

	it("switches to the RETRIEVE tab and displays the PIN input field", async () => {
		const user = userEvent.setup();
		render(<TransferHub />);

		const retrieveTab = screen.getByRole("tab", { name: /retrieve/i });
		await user.click(retrieveTab);

		expect(
			screen.getByText(/enter your 4-digit pin/i),
		).toBeInTheDocument();
		const pinInput = screen.getByPlaceholderText("e.g. 1234");
		expect(pinInput).toBeInTheDocument();

		// Typing into PIN field updates it
		await user.type(pinInput, "4321");
		expect(pinInput).toHaveValue("4321");
	});

	it("switches back from RETRIEVE to DROP tab cleanly", async () => {
		const user = userEvent.setup();
		render(<TransferHub />);

		// Switch to Retrieve
		await user.click(screen.getByRole("tab", { name: /retrieve/i }));
		expect(screen.getByPlaceholderText("e.g. 1234")).toBeInTheDocument();

		// Switch back to Drop
		await user.click(screen.getByRole("tab", { name: /drop/i }));
		expect(
			screen.getByPlaceholderText(/paste text here/i),
		).toBeInTheDocument();
	});

	it("retrieves a drop when pressing Enter with a complete 4-digit PIN", async () => {
		const user = userEvent.setup();
		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => ({
				pin: "1234",
				text: "Secret courier payload",
				files: [],
			}),
		} as Response);
		globalThis.fetch = mockFetch;

		render(<TransferHub />);

		// Switch to Retrieve tab
		await user.click(screen.getByRole("tab", { name: /retrieve/i }));
		const pinInput = screen.getByPlaceholderText("e.g. 1234");

		// Type 4-digit PIN and press Enter
		await user.type(pinInput, "1234{Enter}");

		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledWith(
				"/api/drops/1234",
				expect.any(Object),
			);
			expect(screen.getByText("Payload Caught!")).toBeInTheDocument();
			expect(
				screen.getByText("Secret courier payload"),
			).toBeInTheDocument();
		});
	});

	it("does not retrieve a drop when pressing Enter with an incomplete PIN", async () => {
		const user = userEvent.setup();
		const mockFetch = vi.fn();
		globalThis.fetch = mockFetch;

		render(<TransferHub />);

		// Switch to Retrieve tab
		await user.click(screen.getByRole("tab", { name: /retrieve/i }));
		const pinInput = screen.getByPlaceholderText("e.g. 1234");

		// Type only 2 digits and press Enter
		await user.type(pinInput, "12{Enter}");

		expect(mockFetch).not.toHaveBeenCalled();
		expect(
			screen.queryByText("Payload Caught!"),
		).not.toBeInTheDocument();
	});

	it("retrieves a drop when clicking the Catch It button with a valid PIN", async () => {
		const user = userEvent.setup();
		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => ({
				pin: "5678",
				text: "Retrieved via Catch button",
				files: [],
			}),
		} as Response);
		globalThis.fetch = mockFetch;

		render(<TransferHub />);

		// Switch to Retrieve tab
		await user.click(screen.getByRole("tab", { name: /retrieve/i }));
		const pinInput = screen.getByPlaceholderText("e.g. 1234");

		await user.type(pinInput, "5678");
		const catchButton = screen.getByRole("button", { name: /catch it/i });
		expect(catchButton).not.toBeDisabled();

		await user.click(catchButton);

		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledWith(
				"/api/drops/5678",
				expect.any(Object),
			);
			expect(screen.getByText("Payload Caught!")).toBeInTheDocument();
			expect(
				screen.getByText("Retrieved via Catch button"),
			).toBeInTheDocument();
		});
	});
});
