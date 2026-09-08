<p align="center">
  <img src="https://img.icons8.com/3d-fluency/94/cloud-storage.png" alt="CloudNest Logo" width="80"/>
</p>

<h1 align="center">CloudNest</h1>

<p align="center">
  <strong>Your Personal Cloud — Lightweight, Secure, Self-Hosted.</strong><br/>
  A modern file management system built for Armbian &amp; single-board computers.
</p>

<p align="center">
  <a href="#-features"><img src="https://img.shields.io/badge/status-active-brightgreen?style=flat-square" alt="Status"></a>
  <img src="https://img.shields.io/badge/node-%3E%3D18-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/express-4.x-000000?style=flat-square&logo=express&logoColor=white" alt="Express">
  <img src="https://img.shields.io/badge/sqlite-3-003B57?style=flat-square&logo=sqlite&logoColor=white" alt="SQLite">
  <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License">
</p>

<br/>

---

## ✨ Features

| Feature | Description |
|:--------|:------------|
| 📤 **Chunked & Resumable Uploads** | Handles large files with automatic 2 MB chunking, parallel transfer, and resume-on-failure |
| 🔍 **Auto Storage Discovery** | Automatically detects `/media`, `/mnt`, and custom mount points on Linux systems |
| 🛡️ **Security First** | Path traversal prevention, Helmet headers, CORS, and rate limiting out of the box |
| 🎨 **Glassmorphism UI** | Premium dark-theme dashboard — zero frameworks, pure vanilla HTML / CSS / JS |
| 📱 **Responsive Design** | Works seamlessly from desktop to mobile with adaptive grid & list views |
| ⚡ **SBC Optimized** | Minimal memory footprint — runs smoothly on Raspberry Pi, Orange Pi, and similar boards |
| 🔗 **Shareable Links** | Generate direct download links for any file with one click |
| 📦 **One-Command Deploy** | Automated `systemd` service setup via `deploy-armbian.sh` |

---

## 🏗️ Architecture

```
cloudnest/
├── public/                  # Frontend SPA
│   ├── css/
│   │   ├── main.css         # Design system & tokens
│   │   └── components.css   # Component styles
│   ├── js/
│   │   ├── api.js           # API client layer
│   │   ├── app.js           # Main application controller
│   │   └── components/      # UI modules
│   │       ├── fileGrid.js
│   │       ├── contextMenu.js
│   │       ├── previewModal.js
│   │       ├── storageSidebar.js
│   │       └── uploadManager.js
│   └── index.html
├── server/
│   ├── index.js             # Express entry point
│   ├── config.js            # Central configuration
│   ├── db/                  # SQLite database layer
│   ├── middleware/           # Security middleware
│   ├── routes/              # API route handlers
│   │   ├── files.js         # File operations (CRUD)
│   │   ├── storage.js       # Storage device discovery
│   │   └── upload.js        # Chunked upload endpoint
│   ├── services/            # Business logic
│   │   ├── fileService.js
│   │   ├── chunkService.js
│   │   └── storageService.js
│   └── utils/
│       └── portFinder.js
├── deploy-armbian.sh        # One-click deployment script
└── package.json
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** v18 or higher
- **npm** (bundled with Node.js)

### 1 · Clone & Install

```bash
git clone https://github.com/jnckcode/cloudnest.git
cd cloudnest
npm install
```

### 2 · Run

```bash
# Production
npm start

# Development (hot reload)
npm run dev
```

### 3 · Open

Navigate to **http://localhost:3000** in your browser.

> On Windows, CloudNest automatically creates a `mock_storage/` directory with sample mount points for local testing.

---

## 🐧 Armbian / Linux Deployment

Deploy CloudNest as a background `systemd` service with a single command.

### Prerequisites

Node.js (v18+) and npm must already be installed — either system-wide or via a version manager (nvm, fnm, n, etc.).

### Standard Deploy

```bash
git clone https://github.com/jnckcode/cloudnest.git
cd cloudnest
sudo chmod +x deploy-armbian.sh
sudo ./deploy-armbian.sh
```

### Deploy Directly to `/opt`

If you clone the repo straight into `/opt/cloudnest`, the script will skip the copy step automatically:

```bash
sudo git clone https://github.com/jnckcode/cloudnest.git /opt/cloudnest
cd /opt/cloudnest
sudo chmod +x deploy-armbian.sh
sudo ./deploy-armbian.sh
```

### Using with NVM

When Node.js is managed by nvm, pass your `PATH` through to root:

```bash
sudo -E env "PATH=$PATH" ./deploy-armbian.sh
```

**What the script does:**

1. Validates that `node` and `npm` are available in PATH
2. Installs system dependencies (`sqlite3`, `build-essential`)
3. Copies project to `/opt/cloudnest` (skipped if already there)
4. Installs production npm dependencies
5. Creates storage directory at `/var/cloudnest/storage`
6. Registers and enables a `systemd` service on port `3000`

```bash
# Manage the service
sudo systemctl status cloudnest
sudo systemctl restart cloudnest
sudo journalctl -u cloudnest -f    # Live logs
```

---

## 🔧 Configuration

CloudNest is configured via **environment variables**:

| Variable | Default | Description |
|:---------|:--------|:------------|
| `PORT` | `3000` | Server listen port |
| `NODE_ENV` | — | Set to `production` for optimized mode |
| `CLOUDNEST_STORAGE_ROOT` | `/var/cloudnest/storage` | Root path for file storage on Linux |

---

## 🧰 Tech Stack

<table>
  <tr>
    <td align="center"><img src="https://img.icons8.com/color/48/nodejs.png" width="30"/><br/><sub>Node.js</sub></td>
    <td align="center"><img src="https://img.icons8.com/ios/50/FFFFFF/express-js.png" width="30"/><br/><sub>Express</sub></td>
    <td align="center"><img src="https://img.icons8.com/color/48/sql.png" width="30"/><br/><sub>better-sqlite3</sub></td>
    <td align="center"><img src="https://img.icons8.com/color/48/html-5--v1.png" width="30"/><br/><sub>HTML5</sub></td>
    <td align="center"><img src="https://img.icons8.com/color/48/css3.png" width="30"/><br/><sub>CSS3</sub></td>
    <td align="center"><img src="https://img.icons8.com/color/48/javascript--v1.png" width="30"/><br/><sub>JavaScript</sub></td>
  </tr>
</table>

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for details.

---

<p align="center">
  Built with ☁️ by <a href="https://github.com/jnckcode">jnckcode</a>
</p>
