# @file deploy-armbian.sh
# @description Automated one-click deployment script for CloudNest on Armbian Linux SBC servers.
# @module Deployment
# @dependencies bash, nodejs, systemd, nginx
# @author Agent Architecture Directive

#!/usr/bin/env bash
set -e

echo "============================================================="
echo " 🚀 CloudNest Armbian One-Click Deployment Installer"
echo "============================================================="

# Ensure script is executed with root privileges
if [ "$EUID" -ne 0 ]; then
  echo "❌ Error: Please run this script as root (sudo ./deploy-armbian.sh)"
  exit 1
fi

APP_DIR="/opt/cloudnest"
STORAGE_DIR="/var/cloudnest/storage"
SERVICE_NAME="cloudnest.service"

echo "Step 1: Updating System Packages & Installing Dependencies..."
apt-get update -y
apt-get install -y curl build-essential sqlite3 nginx systemd

# Check Node.js installation
if ! command -v node &> /dev/null; then
  echo "Installing Node.js 20 LTS..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

echo "Step 2: Preparing Application Directory ($APP_DIR)..."
mkdir -p "$APP_DIR"
mkdir -p "$STORAGE_DIR"
chmod 775 "$STORAGE_DIR"

# Copy current project files into APP_DIR
cp -r . "$APP_DIR/"

echo "Step 3: Installing Node.js Production Dependencies..."
cd "$APP_DIR"
npm install --production

echo "Step 4: Setting up Systemd Background Daemon Service..."
cat << EOF > /etc/systemd/system/$SERVICE_NAME
[Unit]
Description=CloudNest Personal Cloud Storage Server
After=network.target local-fs.target

[Service]
Type=simple
User=root
WorkingDirectory=$APP_DIR
ExecStart=$(which node) server/index.js
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

echo "Step 5: Status Check..."
sleep 2
if systemctl is-active --quiet $SERVICE_NAME; then
  echo "============================================================="
  echo " ✅ CloudNest Deployment Successfully Completed!"
  echo "============================================================="
  echo " - Storage Path: $STORAGE_DIR"
  echo " - Systemd Service: active (running)"
  echo " - Web Interface: http://$(hostname -I | awk '{print $1}'):3000"
  echo "============================================================="
else
  echo "⚠️ Warning: CloudNest service started but status check returned inactive. Check logs with 'journalctl -u $SERVICE_NAME'"
fi
