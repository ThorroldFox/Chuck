# Chuck – Developer & Build Guide 🛠️

This document covers everything you need to develop, debug, build, and package **Chuck** from source.

For end-user deployment and server installation, refer to [README.md](Readme.md).

---

## 🏗️ Architecture Overview

Chuck is divided into two distinct components:

* **Frontend (`/UI/Chuck.UI`)**: React 19, TypeScript, Material UI (MUI), Vite.
* **Backend (`/API/Chuck.API`)**: C# ASP.NET Core 10 Web API, zero-database in-memory metadata (`IMemoryCache`), ClamAV virus scanning integration via `nClam`.

At build time, the React UI is compiled via Vite and copied directly into the ASP.NET Core `wwwroot/` folder, allowing a single lightweight container to host both the REST API and the frontend.

---

## 💻 Local Development Setup

### Prerequisites
* [.NET 10 SDK](https://dotnet.microsoft.com/)
* [Node.js 20+](https://nodejs.org/) & `npm`
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) (optional, for container testing)

---

### Running the Backend Locally
1. Navigate to the API project:
   ```bash
   cd API/Chuck.API
   ```
2. Run the API:
   ```bash
   dotnet run
   ```
   * The API runs by default on `https://localhost:5001` / `http://localhost:5000`.
   * Staging directory is set to `C:\app\data\drops` in `appsettings.Development.json`.
   * Virus scanning is defaulted to `false` in development so local testing doesn't require a ClamAV daemon.

---

### Running the Frontend Locally
1. Navigate to the UI project:
   ```bash
   cd UI/Chuck.UI
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start Vite dev server:
   ```bash
   npm run dev
   ```
   * Access the UI at `http://localhost:5173`.
   * Requests to `/api` are handled through the local backend or Vite proxy configuration.

---

## 🧪 Automated Testing

Both the backend and frontend include automated test suites to maintain code quality and prevent regressions across releases.

### Backend Testing (xUnit & NSubstitute)
Backend tests target .NET 10 LTS and cover controllers, orchestrators, and services using xUnit and NSubstitute:

1. **Command Line (`dotnet` CLI):**
   ```bash
   # From the repository root
   dotnet test API/Chuck.slnx

   # Or navigate to the API directory
   cd API
   dotnet test
   ```
2. **VS Code Test Explorer:**
   * Open the repository or `/API` folder in VS Code with the C# Dev Kit extension enabled.
   * Tests in `Chuck.API.Tests` are discovered automatically in the **Testing** tab (flask icon) for point-and-click execution or breakpoint debugging.

---

### Frontend Testing (Vitest & React Testing Library)
Frontend unit and component tests are powered by Vitest, jsdom, and React Testing Library:

1. **Single-Pass Test Run:**
   ```bash
   cd UI/Chuck.UI
   npm test
   ```
2. **Interactive Watch Mode:**
   ```bash
   cd UI/Chuck.UI
   npm run test:watch
   ```
   * Automatically re-runs affected tests upon saving files during development.

---

## 🐳 Building with Docker

### Option 1: Run Development Stack via Compose
To compile and run both Chuck and the ClamAV scanning container directly from source:

```bash
docker compose -f docker-compose.dev.yml up --build
```

---

### Option 2: Build the Container Image Locally
To build the multi-stage container image locally from the repository root:

```bash
docker build -t chuck:latest .
```

Docker's multi-stage build will:
1. Spin up a temporary `node:20-alpine` container to compile the React frontend.
2. Spin up a temporary `mcr.microsoft.com/dotnet/sdk:10.0` container to compile the backend and bundle the frontend into `wwwroot/`.
3. Produce a standalone ~94 MB runtime container (`mcr.microsoft.com/dotnet/aspnet:10.0`).
