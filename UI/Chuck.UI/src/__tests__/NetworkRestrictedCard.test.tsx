import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NetworkRestrictedCard } from "../components/NetworkRestrictedCard";

describe("NetworkRestrictedCard", () => {
	it("renders the network policy message and Chuck Stop artwork", () => {
		render(<NetworkRestrictedCard onRetry={vi.fn()} />);

		expect(
			screen.getByRole("img", { name: /chuck stop/i }),
		).toBeInTheDocument();
		expect(screen.getByText("Access Restricted")).toBeInTheDocument();
		expect(
			screen.getByText(/restricted by network policy/i),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /try again/i }),
		).toBeInTheDocument();
	});

	it("invokes onRetry when Try Again is clicked", () => {
		const onRetry = vi.fn();
		render(<NetworkRestrictedCard onRetry={onRetry} />);

		fireEvent.click(screen.getByRole("button", { name: /try again/i }));

		expect(onRetry).toHaveBeenCalledTimes(1);
	});

	it("shows a checking state and disables the button while retrying", () => {
		render(<NetworkRestrictedCard onRetry={vi.fn()} isRetrying={true} />);

		expect(screen.getByRole("button", { name: /checking/i })).toBeDisabled();
	});
});
