# Security Policy 🛡️

The Chuck maintainers take security and privacy seriously. Because Chuck is engineered for self-hosted and cross-device data transfers without persistent user accounts, rapid and responsible resolution of security issues is our top priority.

---

## Supported Versions

Security updates and patches are actively maintained for the latest release:

| Version | Supported |
| :--- | :--- |
| `v1.0.x` | :white_check_mark: |
| `< v1.0` | :x: |

---

## Reporting a Vulnerability

If you discover a potential security vulnerability in Chuck, **please do not disclose it via a public GitHub Issue, Discussion, or pull request.** Public disclosure places self-hosters and active transfers at risk.

Instead, please report vulnerabilities privately using one of the following methods:

### 1. Direct Email (Preferred)
Send an email detailing your findings to:
* **`support@thorroldfox.com`**

### 2. GitHub Private Vulnerability Reporting
If viewing this repository on GitHub, navigate to the **Security** tab and click **"Report a vulnerability"** to open a confidential advisory directly with the project maintainers.

---

## What to Include in Your Report

To help us investigate and remediate the issue quickly, please include:
1. **Description:** A concise explanation of the vulnerability and its potential impact.
2. **Affected Components:** The affected endpoints, routes, or UI components (e.g. `POST /api/drops`, WebSocket relay, PIN rate limiter).
3. **Reproduction Steps:** Detailed steps, curl commands, or script snippets to reliably reproduce the behaviour.
4. **Proof of Concept (PoC):** Sample payloads or screenshots demonstrating the exploit (sanitised of sensitive personal data).
5. **Mitigation Suggestions:** Any potential architectural or code-level mitigations you have identified.

---

## Our Response Process

1. **Acknowledgement:** As an independent project, reports are triaged on a best-effort basis. We treat security disclosures as a high priority and will acknowledge receipt as soon as practically possible.
2. **Triage & Assessment:** We will validate the issue, determine its severity, and keep you informed of our progress.
3. **Remediation & Patching:** We will draft and test a fix internally before release.
4. **Coordinated Disclosure:** We will publish a patched release (and corresponding release notes) before public disclosure, giving you full credit for the discovery if you wish to be credited.
