import { describe, it, expect, beforeEach } from "vitest";
import {
	getStoredPasscode,
	isPasscodeRemembered,
	savePasscode,
	clearStoredPasscode,
} from "../utils/passcodeUtils";

describe("passcodeUtils", () => {
	beforeEach(() => {
		sessionStorage.clear();
		localStorage.clear();
	});

	it("returns null when no passcode is stored", () => {
		expect(getStoredPasscode()).toBeNull();
		expect(isPasscodeRemembered()).toBe(false);
	});

	it("saves passcode to session storage only when remember is false", () => {
		savePasscode("TempCode123", false);

		expect(getStoredPasscode()).toBe("TempCode123");
		expect(sessionStorage.getItem("chuck_instance_passcode")).toBe("TempCode123");
		expect(localStorage.getItem("chuck_instance_passcode")).toBeNull();
		expect(isPasscodeRemembered()).toBe(false);
	});

	it("saves passcode to both session and local storage when remember is true", () => {
		savePasscode("PersistCode456", true);

		expect(getStoredPasscode()).toBe("PersistCode456");
		expect(sessionStorage.getItem("chuck_instance_passcode")).toBe("PersistCode456");
		expect(localStorage.getItem("chuck_instance_passcode")).toBe("PersistCode456");
		expect(isPasscodeRemembered()).toBe(true);
	});

	it("clears passcode from both session and local storage upon revocation", () => {
		savePasscode("SecretKey789", true);
		expect(getStoredPasscode()).toBe("SecretKey789");

		clearStoredPasscode();

		expect(getStoredPasscode()).toBeNull();
		expect(sessionStorage.getItem("chuck_instance_passcode")).toBeNull();
		expect(localStorage.getItem("chuck_instance_passcode")).toBeNull();
		expect(isPasscodeRemembered()).toBe(false);
	});
});
