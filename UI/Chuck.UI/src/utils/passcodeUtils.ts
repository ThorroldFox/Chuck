/**
 * Utility functions for managing instance passcode persistence and revocation.
 */

const SESSION_KEY = "chuck_instance_passcode";
const LOCAL_KEY = "chuck_instance_passcode";

/**
 * Retrieves any stored passcode from session storage, falling back to local storage.
 */
export function getStoredPasscode(): string | null {
	return sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(LOCAL_KEY);
}

/**
 * Determines whether the passcode is currently persisted in local storage ("Remember me").
 */
export function isPasscodeRemembered(): boolean {
	return !!localStorage.getItem(LOCAL_KEY);
}

/**
 * Stores the passcode in session storage, optionally persisting in local storage if remembered.
 *
 * @param passcode - The verified instance passcode.
 * @param remember - Whether to persist the passcode across browser restarts.
 */
export function savePasscode(passcode: string, remember: boolean): void {
	sessionStorage.setItem(SESSION_KEY, passcode);
	if (remember) {
		localStorage.setItem(LOCAL_KEY, passcode);
	} else {
		localStorage.removeItem(LOCAL_KEY);
	}
}

/**
 * Completely clears stored passcodes from both session and local storage.
 */
export function clearStoredPasscode(): void {
	sessionStorage.removeItem(SESSION_KEY);
	localStorage.removeItem(LOCAL_KEY);
}
