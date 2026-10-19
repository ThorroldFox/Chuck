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

	it("renders a scannable QR code and copies the Quick-Catch link after creating a drop", async () => {
		const user = userEvent.setup();
		const writeTextMock = vi.fn().mockResolvedValue(undefined);
		Object.defineProperty(navigator, "clipboard", {
			value: { writeText: writeTextMock },
			configurable: true,
		});

		const OriginalXHR = globalThis.XMLHttpRequest;
		class MockXHR {
			status = 200;
			responseText = JSON.stringify({
				pin: "4829",
				burnToken: "token-123",
			});
			upload = { onprogress: null as any };
			onload: (() => void) | null = null;
			onerror: (() => void) | null = null;
			open = vi.fn();
			setRequestHeader = vi.fn();
			send = vi.fn(() => {
				if (this.onload) this.onload();
			});
		}
		globalThis.XMLHttpRequest = MockXHR as any;

		try {
			render(<TransferHub />);

			const memoInput = screen.getByPlaceholderText(/paste text here/i);
			await user.type(memoInput, "Quick-Catch test payload");
			await user.click(
				screen.getByRole("button", { name: /chuck it/i }),
			);

			await waitFor(() => {
				expect(screen.getByText("4829")).toBeInTheDocument();
			});

			const qrCode = screen.getByRole("img", {
				name: /qr code for pin 4829/i,
			});
			expect(qrCode).toBeInTheDocument();

			const copyLinkBtn = screen.getByRole("button", {
				name: /copy quick-catch link/i,
			});
			await user.click(copyLinkBtn);

			expect(writeTextMock).toHaveBeenCalledWith(
				expect.stringContaining("?pin=4829"),
			);
			expect(
				screen.getByRole("button", { name: /link copied!/i }),
			).toBeInTheDocument();
		} finally {
			globalThis.XMLHttpRequest = OriginalXHR;
		}
	});

	it("automatically switches to RETRIEVE and catches the drop when opened via a ?pin= Quick-Catch URL", async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => ({
				pin: "7391",
				text: "Caught via QR Quick-Catch link",
				files: [],
			}),
		} as Response);
		globalThis.fetch = mockFetch;

		window.history.pushState({}, "", "/?pin=7391");

		render(<TransferHub />);

		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledWith(
				"/api/drops/7391",
				expect.any(Object),
			);
			expect(screen.getByText("Payload Caught!")).toBeInTheDocument();
			expect(
				screen.getByText("Caught via QR Quick-Catch link"),
			).toBeInTheDocument();
		});

		// Verify the ?pin= query parameter was cleaned from the URL bar
		expect(window.location.search).toBe("");
	});

	it("waits until isUnlocked is true before auto-retrieving a ?pin= Quick-Catch URL", async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => ({
				pin: "6420",
				text: "Unlocked and caught",
				files: [],
			}),
		} as Response);
		globalThis.fetch = mockFetch;

		window.history.pushState({}, "", "/?pin=6420");

		const { rerender } = render(<TransferHub isUnlocked={false} />);

		// Should switch to RETRIEVE and pre-fill PIN, but not fetch while locked
		expect(screen.getByPlaceholderText("e.g. 1234")).toHaveValue("6420");
		expect(mockFetch).not.toHaveBeenCalled();

		// Unlocking triggers automatic retrieval
		rerender(<TransferHub isUnlocked={true} />);

		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledWith(
				"/api/drops/6420",
				expect.any(Object),
			);
			expect(
				screen.getByText("Unlocked and caught"),
			).toBeInTheDocument();
		});
	});

	it("extracts the 4-digit PIN rather than the port number when pasting a Quick-Catch URL from clipboard", async () => {
		const user = userEvent.setup();
		Object.defineProperty(navigator, "clipboard", {
			value: {
				readText: vi
					.fn()
					.mockResolvedValue("http://192.168.1.50:8080/?pin=9412"),
			},
			configurable: true,
		});

		render(<TransferHub />);

		await user.click(screen.getByRole("tab", { name: /retrieve/i }));
		const pasteButton = screen.getByRole("button", {
			name: /paste pin from clipboard/i,
		});
		await user.click(pasteButton);

		await waitFor(() => {
			expect(screen.getByPlaceholderText("e.g. 1234")).toHaveValue(
				"9412",
			);
		});
	});

	it("allows selecting a custom expiry duration (30 mins) and renders the live expiry countdown badge", async () => {
		const user = userEvent.setup();
		let sentFormData: FormData | null = null;

		const OriginalXHR = globalThis.XMLHttpRequest;
		class MockXHR {
			status = 201;
			responseText = JSON.stringify({
				pin: "3030",
				expiresInMinutes: 30,
				expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
				burnToken: "token-30",
			});
			upload = { onprogress: null as any };
			onload: (() => void) | null = null;
			onerror: (() => void) | null = null;
			open = vi.fn();
			setRequestHeader = vi.fn();
			send = vi.fn((body: FormData) => {
				sentFormData = body;
				if (this.onload) this.onload();
			});
		}
		globalThis.XMLHttpRequest = MockXHR as any;

		try {
			render(<TransferHub />);

			// Select "30 mins" expiry chip
			const thirtyMinChip = screen.getByRole("button", {
				name: /30 mins/i,
			});
			await user.click(thirtyMinChip);

			const memoInput = screen.getByPlaceholderText(/paste text here/i);
			await user.type(memoInput, "Thirty minute payload");
			await user.click(
				screen.getByRole("button", { name: /chuck it/i }),
			);

			await waitFor(() => {
				expect(screen.getByText("3030")).toBeInTheDocument();
			});

			expect(sentFormData).not.toBeNull();
			expect(sentFormData!.get("ExpiryMinutes")).toBe("30");
			expect(
				screen.getByText(/expires in (29:|30:00)/i),
			).toBeInTheDocument();
		} finally {
			globalThis.XMLHttpRequest = OriginalXHR;
		}
	});

	it("downloads retrieved text snippet as a .txt file when clicking Download as .txt", async () => {
		const user = userEvent.setup();
		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => ({
				pin: "1234",
				text: "Downloadable text memo",
				expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
				files: [],
			}),
		} as Response);
		globalThis.fetch = mockFetch;

		const createObjectUrlSpy = vi
			.spyOn(URL, "createObjectURL")
			.mockReturnValue("blob:mock-text-url");
		const revokeObjectUrlSpy = vi
			.spyOn(URL, "revokeObjectURL")
			.mockImplementation(() => {});

		try {
			render(<TransferHub />);

			await user.click(screen.getByRole("tab", { name: /retrieve/i }));
			const pinInput = screen.getByPlaceholderText("e.g. 1234");
			await user.type(pinInput, "1234{Enter}");

			await waitFor(() => {
				expect(
					screen.getByText("Downloadable text memo"),
				).toBeInTheDocument();
				expect(
					screen.getByText(/expires in (09:|10:00)/i),
				).toBeInTheDocument();
			});

			const downloadTxtBtn = screen.getByRole("button", {
				name: /download text as \.txt/i,
			});
			await user.click(downloadTxtBtn);

			expect(createObjectUrlSpy).toHaveBeenCalledTimes(1);
			expect(revokeObjectUrlSpy).toHaveBeenCalledWith(
				"blob:mock-text-url",
			);
		} finally {
			createObjectUrlSpy.mockRestore();
			revokeObjectUrlSpy.mockRestore();
		}
	});
});

