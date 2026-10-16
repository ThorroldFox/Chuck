# Changelog

All notable changes to **Chuck** are documented in this file.

## [v1.0.3] - Swift Courier (15/10/2026)

- Instant Enter Key Drop Collection: Added Enter key submission support to the PIN entry field on the Catch tab with full IME composition safety, allowing users to instantly retrieve payloads upon typing their 4-digit PIN without needing to click "Catch It".
- Mobile Numeric Keyboard Integration: Configured dedicated numeric input modes and virtual keyboard action hints (enterKeyHint="go") for seamless drop retrieval on mobile touch devices.

## [v1.0.2] - Fortified Courier (13/10/2026)

- Instance Access Passcodes: Introduced optional instance-wide access protection configured via ChuckSettings__InstancePasscodes. Instances can be secured with single or multiple passcodes using constant-time cryptographic verification (POST /api/config/verify) and custom "Chuck Stop" lock modal artwork.
- "Remember Me" Credential Persistence: Added a "Remember on this device" option to the passcode unlock modal for trusted personal machines, along with a top bar and drawer "Lock Instance" action to immediately clear stored passcodes and lock the session.
- Connection Resilience & "Chuck is Offline" State: Added graceful offline handling featuring custom mascot imagery and automatic background reconnection polling every 5 seconds when the backend server is unreachable.
- Open-Source Governance: Added official MIT LICENSE, SECURITY.md vulnerability reporting guidelines, and CONTRIBUTING.md architectural principles ahead of public repository distribution.
- UI & Visual Polish: Updated branding for the "Fortified Courier" release across the navigation drawer, version chips, and responsive dialogue layouts.

## [v1.0.1] - Resilient Courier (11/10/2026)

- One-Click Clipboard PIN Paste: Added a dedicated paste button directly inside the PIN entry field on the Catch tab, allowing instant pasting of 4-digit PINs from your clipboard.
- Pre-Retrieval Drop Cancellation: Added a "Cancel Drop" button to the PIN screen, allowing senders to immediately recall and incinerate accidental uploads before they are collected.
- Single-Click "Burn Drop": Added a dedicated button on the retrieval dashboard to immediately obliterate an entire drop (all files and text) in one go.
- Server Reboot Resilience: Active drops now safely survive server restarts, container upgrades, and power interruptions until their expiry time.
- UI & Visual Polish: Updated branding for the "Resilient Courier" release, improved action feedback alerts, and refined button layouts.

## [v1.0] - Ephemeral Conduit (06/10/2026)

- Initial release.
