import { describe, it, expect } from "vitest";
import { formatBytes, formatCountdown } from "../utils/formatUtils";

describe("formatUtils", () => {
	describe("formatBytes", () => {
		it("returns '0 Bytes' for zero or negative values", () => {
			expect(formatBytes(0)).toBe("0 Bytes");
			expect(formatBytes(-100)).toBe("0 Bytes");
			expect(formatBytes(NaN)).toBe("0 Bytes");
		});

		it("formats raw byte values under 1 KB accurately", () => {
			expect(formatBytes(500)).toBe("500 Bytes");
			expect(formatBytes(1023)).toBe("1023 Bytes");
		});

		it("formats kilobytes accurately", () => {
			expect(formatBytes(1024)).toBe("1 KB");
			expect(formatBytes(2048)).toBe("2 KB");
			expect(formatBytes(1536, 1)).toBe("1.5 KB");
		});

		it("formats megabytes accurately", () => {
			expect(formatBytes(1048576)).toBe("1 MB");
			expect(formatBytes(524288000)).toBe("500 MB");
		});

		it("formats gigabytes accurately", () => {
			expect(formatBytes(1073741824)).toBe("1 GB");
			expect(formatBytes(2684354560, 1)).toBe("2.5 GB");
		});

		it("respects custom decimal places", () => {
			expect(formatBytes(1234567, 3)).toBe("1.177 MB");
			expect(formatBytes(1234567, 0)).toBe("1 MB");
		});
	});

	describe("formatCountdown", () => {
		it("clamps negative or zero values to '00:00'", () => {
			expect(formatCountdown(0)).toBe("00:00");
			expect(formatCountdown(-45)).toBe("00:00");
		});

		it("formats durations under 1 hour as MM:SS", () => {
			expect(formatCountdown(5)).toBe("00:05");
			expect(formatCountdown(582)).toBe("09:42");
			expect(formatCountdown(1800)).toBe("30:00");
		});

		it("formats durations of 1 hour or more as Xh MMm SSs", () => {
			expect(formatCountdown(3600)).toBe("1h 00m 00s");
			expect(formatCountdown(86382)).toBe("23h 59m 42s");
		});
	});
});

