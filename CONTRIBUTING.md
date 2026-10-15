# Contributing to Chuck 📦🔥

Thank you for your interest in contributing to **Chuck**! 

Chuck is an ephemeral, zero-database self-hosted file and text transfer hub created by [ThorroldFox](https://www.thorroldfox.com/). We welcome community involvement—including bug reports, documentation updates, and performance optimisations—that align with our foundational architectural principles.

---

## 🧭 The Core Philosophy: "Courier, Not a Warehouse"

Before contributing code or proposing features, it is critical to understand what Chuck is—and what it will never be:

1. **Zero Database Overhead (The Ephemeral Promise):**
   Chuck has zero permanent database infrastructure. Drop metadata lives in volatile RAM (`IMemoryCache`), backed by lightweight on-disk JSON sidecars (`{pin}_meta.json`) strictly for crash recovery. Unretrieved valid drops survive container updates, while expired drops are permanently purged during the server startup Boot Sweep.
   * **Pull Requests introducing SQL databases (PostgreSQL, MySQL), SQLite, Redis, or document stores will be declined.**
2. **Strictly Ephemeral Transfers:**
   Files sent through Chuck are transferred on demand, held temporarily, and obliterated immediately upon collection or expiration.
   * **Pull Requests introducing background folder synchronisation, persistent user directories, or cloud-backup features ("the Nextcloud trap") will be declined.**
3. **Stateless & Cookie-Less:**
   Chuck does not track user sessions, require accounts, log client IPs, or store tracking cookies in browsers.

---

## 🛠️ How to Contribute

### 1. Discuss Before You Code (Issue-First Workflow)
To protect Chuck's architectural vision and ensure your time is well-spent, **please open a GitHub Issue before submitting a Pull Request** for any new feature, API modification, or non-trivial refactoring. 

Explain:
* The user friction or problem being solved.
* How your proposal preserves the zero-database, ephemeral promise.
* Proposed API endpoints or UI behaviour.

*Note: Minor typo fixes, documentation corrections, or bug fixes addressing confirmed issues do not require prior discussion.*

### 2. Reporting Bugs
When opening a bug report, please provide:
* A clear and descriptive title.
* Chuck version (e.g. `v1.0.1`) and deployment environment (Docker Compose, bare metal, reverse proxy).
* Exact reproduction steps and expected vs. actual behaviour.
* Relevant container logs (`docker compose logs chuck`).

---

## 📐 Development Guidelines & Standards

### 1. British English (UK) Standard
Chuck strictly enforces **British English (UK)** spelling across all project surfaces without exception:
* **User Interfaces & Copy:** All labels, dialogs, toasts, error messages, and release notes (e.g. *optimisations*, *behaviour*, *defence*, *synchronisation*, *cancelled*, *burnt*, *licence*).
* **Source Code & Identifiers:** Internal class names, method names, variables, parameters, and constants must adopt British English (e.g. `ExpiryMinutes`, `onBurnt`, `onFileBurnt`, `burntId`, `serialisedData`).
* **Exceptions:** External dependencies and framework identifiers (e.g. .NET Base Class Library `JsonSerializer`, CSS `center`, Material UI `color`) remain unaltered.

### 2. Indentation & Formatting
* **Tab Characters:** All C#, TypeScript/React, and HTML files (`.cs`, `.ts`, `.tsx`, `.html`) must be indented using **tab characters (`\t`)** configured to a display width of 4 spaces (`indent_style = tab`, `tab_width = 4`). Spaces for indentation are prohibited.
* **Trailing Newlines:** All source and documentation files must terminate with a trailing newline character (`insert_final_newline = true`).
* Enforced project-wide via root `.editorconfig`.

### 3. Layered Architectural Pattern
The backend adheres strictly to the **Controller-Orchestrator-Service** pattern:
* **`DropsController`:** Handles HTTP routing, model binding, headers, and streaming responses.
* **`DropsOrchestrator`:** Business validation, quota checks, HATEOAS link creation, and targeted drop routing.
* **`DropService`:** Memory cache operations, file I/O staging, JSON sidecars, and ClamAV integration.
* **Individual Model Files:** Every model, DTO, and response class must reside in its own dedicated source file.

### 4. Zero Commercial Tooling Paywalls
Contributions must strictly avoid third-party libraries, packages, or tools requiring commercial licences, subscriptions, or proprietary keys. Chuck's web stack is 100% free and open-source (MIT/Apache-2.0).

### 5. Automated Testing Mandate
Before opening a Pull Request, all automated unit and integration tests must pass with zero warnings or regressions:

```bash
# Backend test suite (.NET 10 LTS xUnit)
dotnet test API/Chuck.slnx

# Frontend test suite (React 19 Vitest)
cd UI/Chuck.UI
npm test
```

---

## 🚀 Submitting a Pull Request

1. Fork the repository and create a feature branch (`git checkout -b feature/my-feature`).
2. Write clean, well-tested code following the project guidelines above.
3. Verify that `dotnet test` and `npm test` execute cleanly with zero failures.
4. Commit your changes with descriptive commit messages.
5. Push to your branch and open a Pull Request referencing the initial discussion Issue.
