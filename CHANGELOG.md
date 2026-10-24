# Changelog

All notable changes to **Chuck** are documented in this file.

## [v1.0.7] - Steadfast Courier (24/10/2026)

- Real-Time Uploader Lifecycle & Burnt Updates: The active upload screen now continuously tracks drop state in the background, displaying a "Collected by recipient" badge when retrieved and automatically transitioning to a prominent "Drop Burnt" notice once the recipient incinerates the payload from the server, cleanly resetting obsolete PINs and QR codes.
- Inline Plain Text & Source Code Preview: Added an inline preview for plain text, log, markdown, JSON, CSV, configuration, and source code files (supporting over 40 formats including .txt, .log, .md, .json, .csv, .php, .cs, .py, .js, .ts, .sql, and .env up to 1 MB) featuring a one-click "Copy Text" button to quickly inspect and copy content without downloading files to disk.
- Staged Files Summary & "Clear All": Added an aggregate file count and total payload size badge above staged uploads on the Drop tab, accompanied by a single-click "Clear all" button to easily reset or discard queued files and folder trees.
- Native Docker Container Health Monitoring: Added a dedicated /health endpoint and configured container health checks in both the Dockerfile and docker-compose.yml, allowing Docker to automatically detect hung processes and restart the container.
- Staged Thumbnail Memory Hygiene: Refactored image thumbnail rendering in the upload staging queue to automatically revoke blob object URLs, preventing browser memory leaks during drafting and countdown intervals.

## [v1.0.6] - Vigilant Courier (20/10/2026)

- Inline Image Preview & One-Click Clipboard Copy: Added previews for retrieved images (PNG, JPEG, WebP, GIF, BMP, AVIF) with a dedicated "Copy Image" action, allowing screenshots to be viewed and copied straight to the clipboard without saving to the Downloads folder.
- Dynamic Payload Size Enforcement: Synchronised the frontend upload quota with the server's configured ChuckSettings__MaxPayloadSizeBytes via /api/config, dynamically displaying and enforcing custom instance upload limits.
- Pre-Flight Storage Protection (HTTP 507): Introduced a pre-flight disk space ceiling (ChuckSettings__MinFreeDiskSpaceBytes, default 1 GB) that rejects incoming uploads with HTTP 507 Insufficient Storage if staging the payload would compromise host disk headroom.
- Network Access Controls & Reverse Proxy Overrides: Added optional client IP and CIDR subnet whitelisting (ChuckSettings__AllowedNetworks) paired with a dedicated "Access Restricted" screen, alongside custom reverse proxy overrides (ChuckSettings__TrustedProxies) for proxies operating outside RFC 1918 private subnets.
- Security & Code Scanning Hardening.

## [v1.0.5] - Clockwork Courier (19/10/2026)

- Sender-Selectable Ephemeral Expiry Windows: Added an "Auto-burn after:" duration selector on the Drop tab, allowing senders to choose between 5, 10, or 30-minute lifetimes for anonymous drops while enforcing server-side bounds (1–30 minutes).
- Live Expiry Countdown Timers: Added real-time ticking countdown badges ("Expires in MM:SS") to both the sender's PIN Success Card and the recipient's Retrieve dashboard, transitioning to a warning indicator in the final minute and automatically clearing the interface upon expiry.
- Recursive Folder Drag-and-Drop: Enhanced the upload drop zone to recursively traverse dropped directories and subdirectories, automatically extracting and queueing all constituent files.
- One-Click Text Snippet Download: Added a "Download as .txt" button alongside the clipboard copy action on retrieved text payloads to save snippets directly as Chuck-Snippet.txt.
- UI & Documentation Polish: Updated "How Chuck Works" and "About Chuck" dialogs.
- Security & Dependency Hardening: Enforced integer PINs across all parameters, introduced two-tier per-IP rate limiting (StrictPolicy at 20 req/min for PIN/passcode/upload endpoints and GeneralPolicy at 120 req/min for status polling and GUID-gated file actions), restricted ForwardedHeaders to private/loopback proxy networks, hardened physical file path resolution and uploaded filenames/MIME types against path traversal and header injection, added ZIP entry deduplication, multi-file batch rollback on malware scan failure, and a 100,000-character text payload cap, suppressed server fingerprinting header, added baseline HTTP security headers (X-Content-Type-Options, X-Frame-Options, Referrer-Policy), resolved security advisories.

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
