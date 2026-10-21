import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import App from "../App";

const mockConfigResponse = (status: number, body: unknown = {}) =>
	vi.fn().mockResolvedValue({
		ok: status >= 200 && status < 300,
		status,
		json: async () => body,
	} as Response);

describe("App network policy and instance configuration handling", () => {
	const originalFetch = globalThis.fetch;

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
	});

	it("shows the Access Restricted card when /api/config responds with HTTP 403", async () => {
		globalThis.fetch = mockConfigResponse(403, {
			code: "network_restricted",
		});

		render(<App />);

		expect(await screen.findByText("Access Restricted")).toBeInTheDocument();
		// The transfer hub must not render behind the restriction screen
		expect(screen.queryByRole("tab", { name: /drop/i })).not.toBeInTheDocument();
		// 403 is a policy decision, not an outage
		expect(screen.queryByText(/chuck is offline/i)).not.toBeInTheDocument();
	});

	it("re-checks the instance when Try Again is clicked and recovers once the network is permitted", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce({
				ok: false,
				status: 403,
				json: async () => ({ code: "network_restricted" }),
			} as Response)
			.mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => ({
					isPasscodeProtected: false,
					maxPayloadSizeBytes: 524288000,
				}),
			} as Response);
		globalThis.fetch = fetchMock;

		render(<App />);
		await screen.findByText("Access Restricted");

		fireEvent.click(screen.getByRole("button", { name: /try again/i }));

		await waitFor(() => {
			expect(screen.queryByText("Access Restricted")).not.toBeInTheDocument();
			expect(screen.getByRole("tab", { name: /drop/i })).toBeInTheDocument();
		});
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it("renders the transfer hub when /api/config succeeds", async () => {
		globalThis.fetch = mockConfigResponse(200, {
			isPasscodeProtected: false,
			maxPayloadSizeBytes: 1073741824,
		});

		render(<App />);

		expect(
			await screen.findByRole("tab", { name: /drop/i }),
		).toBeInTheDocument();
		expect(screen.queryByText("Access Restricted")).not.toBeInTheDocument();
	});
});
