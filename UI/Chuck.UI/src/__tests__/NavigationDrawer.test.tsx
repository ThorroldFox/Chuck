import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NavigationDrawer } from "../components/NavigationDrawer";

describe("NavigationDrawer", () => {
	it("renders brand elements and version info when open", () => {
		const onClose = vi.fn();
		render(<NavigationDrawer open={true} onClose={onClose} />);

		expect(screen.getByText("CHUCK")).toBeInTheDocument();
		expect(screen.getByText(/the ephemeral transfer hub/i)).toBeInTheDocument();
		expect(screen.getByText("How It Works")).toBeInTheDocument();
		expect(screen.getByText("About Chuck")).toBeInTheDocument();
		expect(screen.getByText("Privacy & Security")).toBeInTheDocument();
	});

	it("opens the 'About Chuck' modal and calls onClose when clicked", async () => {
		const user = userEvent.setup();
		const onClose = vi.fn();
		render(<NavigationDrawer open={true} onClose={onClose} />);

		const aboutButton = screen.getByRole("button", { name: /about chuck/i });
		await user.click(aboutButton);

		expect(onClose).toHaveBeenCalled();
		expect(screen.getByText(/lightning-fast, zero-database/i)).toBeInTheDocument();

		// Close modal using Dialog's close button
		const closeDialogBtn = screen.getAllByRole("button", { name: /^close$/i })[0];
		await user.click(closeDialogBtn);

		// Wait for MUI Dialog exit transition to unmount the dialog
		await waitFor(() => {
			expect(screen.queryByText(/lightning-fast, zero-database/i)).not.toBeInTheDocument();
		});
	});

	it("opens the 'Privacy & Security' modal when clicked", async () => {
		const user = userEvent.setup();
		const onClose = vi.fn();
		render(<NavigationDrawer open={true} onClose={onClose} />);

		const privacyButton = screen.getByRole("button", {
			name: /privacy & security/i,
		});
		await user.click(privacyButton);

		expect(onClose).toHaveBeenCalled();
		expect(screen.getByText(/stateless & cookie-free/i)).toBeInTheDocument();
	});
});
