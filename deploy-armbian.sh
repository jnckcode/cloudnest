# @file deploy-armbian.sh
# @description Automated deployment script for CloudNest on Armbian Linux SBC servers.
#              Assumes Node.js and npm are already installed (system-wide or via NVM).
# @module Deployment
# @dependencies bash, nodejs (pre-installed), systemd
# @author Agent Architecture Directive

#!/usr/bin/env bash
set -e

echo "============================================================="
echo " 🚀 CloudNest Armbian Deployment Installer"
echo "============================================================="

# Ensure script is executed with root privileges
if [ "$EUID" -ne 0 ]; then
  echo "❌ Error: Please run this script as root (sudo ./deploy-armbian.sh)"
  exit 1
fi

# ─── Pre-flight: Verify Node.js & npm availability ───────────────
NODE_BIN=$(which node 2>/dev/null || true)
NPM_BIN=$(which npm 2>/dev/null || true)

if [ -z "$NODE_BIN" ] || [ -z "$NPM_BIN" ]; then
  echo "❌ Error: node or npm not found in PATH."
  echo ""
  echo "   If you use a Node Version Manager (nvm, fnm, n, etc.),"
  echo "   make sure the correct version is activated before running"
  echo "   this script. For example with nvm:"
  echo ""
  echo "     export NVM_DIR=\"\$HOME/.nvm\""
  echo "     [ -s \"\$NVM_DIR/nvm.sh\" ] && . \"\$NVM_DIR/nvm.sh\""
  echo "     nvm use --lts"
  echo "     sudo -E env \"PATH=\$PATH\" ./deploy-armbian.sh"
  echo ""
  echo "   Alternatively, install Node.js system-wide first."
  exit 1
fi

echo "✓ Node.js : $($NODE_BIN -v)  ($NODE_BIN)"
echo "✓ npm     : $($NPM_BIN -v)  ($NPM_BIN)"

APP_DIR="/opt/cloudnest"
STORAGE_DIR="/var/cloudnest/storage"
SERVICE_NAME="cloudnest.service"

# ─── Step 1: Install system-level dependencies ───────────────────
echo ""
echo "Step 1: Installing System Dependencies..."
apt-get update -y
apt-get install -y sqlite3

# ─── Step 2: Prepare application directory ────────────────────────
echo ""
echo "Step 2: Preparing Application Directory ($APP_DIR)..."

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

mkdir -p "$STORAGE_DIR"
chmod 775 "$STORAGE_DIR"

# Skip copy if already running from /opt/cloudnest
if [ "$(realpath "$SCRIPT_DIR")" = "$(realpath "$APP_DIR")" ]; then
  echo "✓ Project already located in $APP_DIR — skipping copy."
else
  mkdir -p "$APP_DIR"
  echo "  Copying project files to $APP_DIR..."
  cp -r "$SCRIPT_DIR/." "$APP_DIR/"
fi

# ─── Step 3: Install Node.js production dependencies ─────────────
echo ""
echo "Step 3: Installing Production Dependencies..."
cd "$APP_DIR"
"$NPM_BIN" install --production

# ─── Step 4: Setup systemd service ───────────────────────────────
echo ""
echo "Step 4: Setting up Systemd Service..."
cat <<EOF > /etc/systemd/system/$SERVICE_NAME
[Unit]
Description=CloudNest Personal Cloud Storage Server
After=network.target local-fs.target

[Service]
Type=simple
User=root
WorkingDirectory=$APP_DIR
ExecStart=$NODE_BIN $APP_DIR/server/index.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=CLOUDNEST_STORAGE_ROOT=$STORAGE_DIR

[Install]
WantedBy=multi-user.target
EOF

echo "Reloading Systemd daemon & enabling service..."
systemctl daemon-reload
systemctl enable $SERVICE_NAME
systemctl restart $SERVICE_NAME

# ─── Step 5: Status check ────────────────────────────────────────
echo ""
echo "Step 5: Status Check..."
sleep 2
if systemctl is-active --quiet $SERVICE_NAME; then
  echo "============================================================="
  echo " ✅ CloudNest Deployment Successfully Completed!"
  echo "============================================================="
  echo " - Storage Path : $STORAGE_DIR"
  echo " - Service      : active (running)"
  echo " - Web Interface: http://$(hostname -I | awk '{print $1}'):3000"
  echo "============================================================="
else
  echo "⚠️ Warning: Service may not have started correctly."
  echo "   Check logs with: journalctl -u $SERVICE_NAME -n 50 --no-pager"
fi
