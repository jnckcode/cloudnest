# CloudNest ☁️

Lightweight, Secure, Personal Cloud Storage Application optimized for Armbian & SBC servers.

## Features

- **Chunked File Transfer & Resumable Uploads**: Upload large files seamlessly with automatic chunking and retry mechanism.
- **Automated Storage Discovery**: Automatically detects mounted storage devices and system drives.
- **Robust Security**: Built-in protection against path traversal, rate limiting, and security headers via Helmet.
- **Glassmorphism UI**: Modern, responsive dashboard built with clean vanilla HTML, CSS, and JS.
- **Armbian / SBC Optimized**: Minimal CPU & RAM footprint, ideal for single-board computers like Raspberry Pi or Orange Pi running Armbian.
- **One-Command Deployment**: Includes automated deployment script (`deploy-armbian.sh`) for quick setup as a systemd service.

## Tech Stack

- **Backend**: Node.js, Express, SQLite3
- **Frontend**: Vanilla HTML5, CSS3 (Glassmorphism design system), ES6+ JavaScript
- **Security**: Helmet, Express Rate Limit, Path Traversal Sanitation

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/jnckcode/cloudnest.git
   cd cloudnest
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the application:
   ```bash
   npm start
   ```

   For development with hot reload:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:3000`.

## Armbian / Linux Deployment

To deploy CloudNest as a system service on Armbian or Linux:

```bash
chmod +x deploy-armbian.sh
./deploy-armbian.sh
```

## License

[MIT](LICENSE)
