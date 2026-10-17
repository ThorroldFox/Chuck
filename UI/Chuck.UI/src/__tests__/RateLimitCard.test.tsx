import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RateLimitCard } from "../components/RateLimitCard";

describe("RateLimitCard", () => {
	it("renders rate limit elements and Chuck Stop artwork", () => {
		const onRetry = vi.fn();
		render(<RateLimitCard onRetry={onRetry} />);

		expect(
			screen.getByRole("img", { name: /chuck stop/i }),
		).toBeInTheDocument();
		expect(screen.getByText("Too Many Requests")).toBeInTheDocument();
		expect(
			screen.getByText(/chuck's rate limiter has been triggered/i),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: /try again/i }),
		).toBeInTheDocument();
	});

	it("invokes onRetry when button is clicked", () => {
		const onRetry = vi.fn();
		render(<RateLimitCard onRetry={onRetry} />);

		const button = screen.getByRole("button", { name: /try again/i });
		fireEvent.click(button);

		expect(onRetry).toHaveBeenCalledTimes(1);
	});

	it("displays checking spinner and disables button when isRetrying is true", () => {
		const onRetry = vi.fn();
		render(<RateLimitCard onRetry={onRetry} isRetrying={true} />);

		const button = screen.getByRole("button", { name: /checking/i });
		expect(button).toBeDisabled();
	});
});
