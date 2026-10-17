# Changelog

All notable changes to **Chuck** are documented in this file.

## [v1.0.4] - Optical Courier (17/10/2026)

- Scannable QR Code Drop Retrieval: Added client-side SVG QR code generation to the PIN Success Card on the Drop tab, enabling camera-equipped mobile phones to instantly open and catch drops without manually typing a 4-digit PIN.
- One-Click Quick-Catch Deep Links: Added a dedicated "Copy Quick-Catch Link" button to the PIN Success Card, generating deep links (/?pin=1234) that automatically switch to the Catch tab, pre-fill the PIN, and retrieve the payload while safely stripping the query parameter from the browser address bar.
- Smart URL Clipboard Parsing: Enhanced the clipboard paste action on the PIN entry field to intelligently extract the 4-digit PIN from full Quick-Catch URLs without mistaking port numbers (e.g. :8080) for the PIN.
- Instance Passcode Coordination: Quick-Catch links seamlessly respect instance access passcodes, safely deferring payload retrieval until the session is authenticated.
- Dedicated Rate Limit Interface & Cooldown Handling: Introduced a dedicated "Too Many Requests" card with custom "Chuck Stop" artwork when an HTTP 429 occurs, clearly distinguishing rate limits from offline server states and stopping automatic retry loops from exhausting cooldown windows.
- UI & Visual Polish: Updated branding and release metadata for the "Optical Courier" release across the navigation drawer and version chips.

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
