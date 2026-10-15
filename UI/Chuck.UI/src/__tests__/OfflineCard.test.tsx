import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OfflineCard } from "../components/OfflineCard";

describe("OfflineCard", () => {
	it("renders offline elements and mascot image", () => {
		const onRetry = vi.fn();
		render(<OfflineCard onRetry={onRetry} />);

		expect(screen.getByRole("img", { name: /chuck puzzled/i })).toBeInTheDocument();
		expect(screen.getByText("Chuck is Offline")).toBeInTheDocument();
		expect(screen.getByText(/unable to communicate with the chuck server/i)).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /retry connection/i })).toBeInTheDocument();
	});

	it("invokes onRetry when button is clicked", () => {
		const onRetry = vi.fn();
		render(<OfflineCard onRetry={onRetry} />);

		const button = screen.getByRole("button", { name: /retry connection/i });
		fireEvent.click(button);

		expect(onRetry).toHaveBeenCalledTimes(1);
	});

	it("displays reconnecting spinner and disables button when isRetrying is true", () => {
		const onRetry = vi.fn();
		render(<OfflineCard onRetry={onRetry} isRetrying={true} />);

		const button = screen.getByRole("button", { name: /reconnecting/i });
		expect(button).toBeDisabled();
	});
});
