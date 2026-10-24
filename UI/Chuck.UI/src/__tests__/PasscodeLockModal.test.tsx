import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PasscodeLockModal } from "../components/PasscodeLockModal";

describe("PasscodeLockModal", () => {
	const onUnlocked = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		sessionStorage.clear();
		localStorage.clear();
	});

	it("renders dialog elements when open", () => {
		render(<PasscodeLockModal open={true} onUnlocked={onUnlocked} />);

		expect(screen.getByAltText("Chuck Stop")).toBeInTheDocument();
		expect(screen.getByText("Instance Locked")).toBeInTheDocument();
		expect(screen.getByLabelText(/Instance Passcode/i)).toBeInTheDocument();
		expect(screen.getByText("Remember on this device")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Unlock" })).toBeInTheDocument();
	});

	it("successfully verifies passcode and triggers onUnlocked", async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => ({ message: "Passcode verified." }),
		} as Response);

		render(<PasscodeLockModal open={true} onUnlocked={onUnlocked} />);

		const input = screen.getByLabelText(/Instance Passcode/i);
		await userEvent.type(input, "ValidKey123");

		const submitButton = screen.getByRole("button", { name: "Unlock" });
		fireEvent.click(submitButton);

		await waitFor(() => {
			expect(globalThis.fetch).toHaveBeenCalledWith("/api/v1/config/verify", expect.objectContaining({
				method: "POST",
				body: JSON.stringify({ passcode: "ValidKey123" }),
			}));
			expect(onUnlocked).toHaveBeenCalledWith("ValidKey123");
			expect(sessionStorage.getItem("chuck_instance_passcode")).toBe("ValidKey123");
		});
	});

	it("displays error banner when passcode is incorrect (401)", async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: false,
			status: 401,
			json: async () => ({ message: "Incorrect instance passcode." }),
		} as Response);

		render(<PasscodeLockModal open={true} onUnlocked={onUnlocked} />);

		const input = screen.getByLabelText(/Instance Passcode/i);
		await userEvent.type(input, "WrongCode");

		const submitButton = screen.getByRole("button", { name: "Unlock" });
		fireEvent.click(submitButton);

		await waitFor(() => {
			expect(screen.getByText("Incorrect passcode. Please try again.")).toBeInTheDocument();
			expect(onUnlocked).not.toHaveBeenCalled();
		});
	});
});
