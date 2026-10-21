# Chuck 📦🔥

[![Build & Test](https://github.com/ThorroldFox/Chuck/actions/workflows/build-and-test.yml/badge.svg)](https://github.com/ThorroldFox/Chuck/actions/workflows/build-and-test.yml)
[![Licence: MIT](https://img.shields.io/badge/Licence-MIT-yellow.svg)](LICENSE)

**The Ephemeral Transfer Hub.**

Chuck is a lightning-fast, zero-database, self-hosted web application designed for one thing: moving files and text securely between devices, and then burning the evidence.

There are no user accounts, no tracking cookies, and no permanent database overhead. You drop your payload, get a 4-digit PIN, catch it on the other side, and the files are obliterated.

---

## 🚀 Features

* **Burn After Reading:** The moment a payload is caught, receivers or senders can obliterate it from the server with a single click.
* **In-Flight Cancellation:** Senders retain pre-retrieval cancellation authority ("Cancel Drop") to revoke and incinerate accidental uploads before collection.
* **Crash Resilience & Boot Sweep:** Active drops safely survive server restarts, power loss, and container upgrades via lightweight on-disk JSON sidecars, while expired drops are automatically purged during the startup Boot Sweep.
* **On-The-Fly Zipping:** Drop multiple files, and Chuck streams them directly into an uncompressed `.zip` file on download without consuming server RAM or disk buffering.
* **Selectable Expiry Windows & Live Countdown Timers:** Choose a 5, 10, or 30-minute auto-burn lifetime when creating a drop, and track remaining lifetime in real time via live countdown badges on both the sender and recipient views.
* **Recursive Folder Drag-and-Drop & `.txt` Export:** Drag entire folders directly into the drop zone to automatically extract and queue their files, and download retrieved text snippets as `.txt` files with a single click.
* **Instance Access Passcodes:** Optionally lock down your server with single or multiple passcodes (`ChuckSettings__InstancePasscodes`) using constant-time verification, with session lock and device persistence controls.
* **QR Code & Quick-Catch Links:** Scan the generated QR code with a phone camera or share a one-click Quick-Catch link (`/?pin=1234`) to automatically retrieve payloads without typing the PIN.
* **One-Click Clipboard PIN Paste:** Quickly paste 4-digit PINs or Quick-Catch links from your clipboard straight into the retrieval input with a single click.
* **Instant Enter Key Catching:** Immediately retrieve payloads upon pressing Enter after entering your 4-digit PIN with full IME and mobile keyboard support.
* **Stateless & Cookie-Less:** Built to respect privacy. Chuck doesn't track IP addresses, require logins, or store tracking cookies in your browser.
* **Integrated Antivirus Scanning:** Built-in ClamAV integration to detect and reject malware before payloads can be caught.
* **Dynamic Storage Protection:** Uploads are rejected with HTTP 507 (Insufficient Storage) whenever accepting them would leave your server with less than a configurable free-disk-space reserve (1 GB by default), preventing a full disk.
* **Instance-Aware Upload Limits:** The web UI automatically adopts your configured `ChuckSettings__MaxPayloadSizeBytes` limit, so the size shown and enforced in the browser always matches the server.
* **Image Preview & One-Click Copy:** Preview retrieved screenshots and photos inline and copy them straight to your clipboard without saving anything to your Downloads folder (clipboard copy requires HTTPS or `localhost`).
* **Network Access Controls:** Optionally restrict Chuck to specific client IP addresses or CIDR subnets (`ChuckSettings__AllowedNetworks`) and trust additional reverse proxies (`ChuckSettings__TrustedProxies`).

---

## 🏗️ Architecture & Philosophy

The core philosophy of Chuck is **Zero Database Overhead**. Transfer metadata (PINs, file descriptions, and expiration timers) lives in volatile RAM (`IMemoryCache`), backed by lightweight on-disk JSON sidecars (`{pin}_meta.json`) strictly for crash recovery. Files are temporarily written to a staging directory.

### The Ephemeral Promise (Data Persistence)
Because Chuck does not use SQL, SQLite, or Redis, **it is entirely ephemeral and self-cleaning.**

Active, unexpired drops survive container upgrades and server restarts. When the server boots up, its **Boot Sweep** engine inspects all staged drops, restores valid active drops back into memory, and permanently purges any expired payloads and orphaned files.

Chuck is not a cloud backup solution like Nextcloud or Google Drive; it is a courier, not a warehouse. This guarantees that your server never accumulates forgotten data.

---

## 🛠️ Quick Start & Production Deployment

Chuck requires only **Docker** and **Docker Compose** on your host. You do not need Node.js, npm, or the .NET SDK installed on your server.

### Option 1: Standard Deployment (GitHub Container Registry)

Download [`docker-compose.yml`](docker-compose.yml) to a directory on your server and run:

```bash
# Pulls ghcr.io/thorroldfox/chuck:latest and launches Chuck with ClamAV
docker compose up -d
```

### Option 2: Offline / Air-Gapped Deployment (`.tar` Release Archive)

For private homelabs or air-gapped servers without registry access, standalone container archives are attached to each [GitHub Release](https://github.com/ThorroldFox/Chuck/releases). Transfer `docker-compose.yml` and `chuck-v1.0.6.tar` to your server, then run:

```bash
# 1. Load the standalone Chuck image into Docker
docker load -i chuck-v1.0.6.tar

# 2. Launch Chuck and ClamAV in the background
docker compose up -d
```

Access the application in your browser at:
```text
http://<your-server-ip>:8080
```

---

## ⚙️ Docker Compose Configuration

Your production `docker-compose.yml` file:

```yaml
services:
  chuck:
    image: ghcr.io/thorroldfox/chuck:latest
    container_name: chuck
    ports:
      - "8080:8080"
    volumes:
      # Maps local drops storage to the container
      - ./data/drops:/app/data/drops
    environment:
      - ASPNETCORE_ENVIRONMENT=Production
      - ChuckSettings__MaxPayloadSizeBytes=524288000 # 500MB
      - ChuckSettings__DiskStoragePath=/app/data/drops
      # Virus scanning via ClamAV (set to false to disable)
      - ChuckSettings__EnableVirusScanning=true
      - ChuckSettings__ClamAvHost=clamav
      - ChuckSettings__ClamAvPort=3310
    depends_on:
      - clamav
    restart: unless-stopped

  clamav:
    image: clamav/clamav:latest
    container_name: chuck-clamav
    restart: unless-stopped
    volumes:
      - ./data/drops:/app/data/drops:ro # Read-only shared mount for zero-copy file scanning
      - clamav-db:/var/lib/clamav       # Persists virus definitions across restarts

volumes:
  clamav-db:
```

### Environment Variables

| Variable | Default | Description |
| :--- | :--- | :--- |
| `ASPNETCORE_ENVIRONMENT` | `Production` | Sets ASP.NET Core environment mode. |
| `ChuckSettings__MaxPayloadSizeBytes` | `524288000` | Maximum size of a single drop in bytes (default: 500 MB). |
| `ChuckSettings__DiskStoragePath` | `/app/data/drops` | Directory inside the container where temporary files are staged. |
| `ChuckSettings__EnableVirusScanning` | `true` | Enables or disables ClamAV file scanning on upload. |
| `ChuckSettings__ClamAvHost` | `clamav` | Hostname of the ClamAV container service. |
| `ChuckSettings__ClamAvPort` | `3310` | Port of the ClamAV daemon. |
| `ChuckSettings__InstancePasscodes` | *(None)* | Optional comma-separated passcodes to lock down instance access. |
| `ChuckSettings__MinFreeDiskSpaceBytes` | `1073741824` | Free disk space (in bytes) that must remain on the storage volume after an upload. Uploads that would breach it are rejected with HTTP 507. Set to `0` to disable. |
| `ChuckSettings__AllowedNetworks` | *(None)* | Optional comma-separated client IP addresses and/or CIDR subnets permitted to use the instance (e.g. `192.168.1.0/24,100.64.0.0/10,203.0.113.7`). Visitors outside the list see an "Access Restricted" screen. Loopback is **not** exempt. Invalid entries stop Chuck from starting. |
| `ChuckSettings__TrustedProxies` | *(None)* | Optional comma-separated IP addresses and/or CIDR subnets of additional reverse proxies whose `X-Forwarded-For` header is trusted. Loopback and private (RFC 1918 / IPv6 ULA) ranges are always trusted; list only proxies outside those ranges. |

#### Restricting access by network

If you use `ChuckSettings__AllowedNetworks` behind a reverse proxy, Chuck evaluates the client address reported by the proxy via `X-Forwarded-For`. Proxies on private or loopback addresses (the usual Docker or LAN setup) are trusted automatically; add any other proxy to `ChuckSettings__TrustedProxies`, otherwise Chuck sees only the proxy's address. Only `/api` routes are blocked: the web page itself is still served so that restricted visitors can be told why they cannot proceed.

---

## 📋 Common Management Commands

```bash
# View live container logs
docker compose logs -f

# Check status of running services
docker compose ps

# Restart services (re-hydrates active drops and purges expired staging via Boot Sweep)
docker compose restart

# Stop the services
docker compose down
```

---

## 🌐 Reverse Proxy & HTTPS (Nginx)

When exposing Chuck behind an Nginx reverse proxy, ensure `client_max_body_size` matches your drop payload limit and proxy buffering is disabled for chunked streaming responses:

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

server {
    server_name chuck.example.com;
    listen 443 ssl http2;

    client_max_body_size 500M;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Disable buffering for on-the-fly streaming zip responses
        proxy_buffering off;
    }
}
```

---

## 💻 Development & Building from Source

For local development, building the React/C# application, compiling Docker images from source, or packaging release `.tar` archives, see the [Developer Guide](DEVELOPMENT.md).

---

## 🛡️ Licence & Credits
* Developed by [ThorroldFox](https://www.thorroldfox.com/)
* Released under the [MIT Licence](LICENSE)
