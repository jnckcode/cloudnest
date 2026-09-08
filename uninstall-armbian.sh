#!/usr/bin/env bash
# @file uninstall-armbian.sh
# @description Clean & Complete Uninstaller for CloudNest on Armbian Linux SBC servers.
#              Removes systemd service, application files, storage, database, environment, and temp data.
# @module Deployment
# @dependencies bash, systemd
# @author Agent Architecture Directive

set -e

echo "============================================================="
echo " 🗑️  CloudNest Complete Uninstaller"
echo "============================================================="

# Ensure script is executed with root privileges
if [ "$EUID" -ne 0 ]; then
  echo "❌ Error: Please run this script as root (sudo ./uninstall-armbian.sh)"
  exit 1
fi

APP_DIR="/opt/cloudnest"
STORAGE_DIR="/var/cloudnest"
SERVICE_NAME="cloudnest.service"
SERVICE_FILE="/etc/systemd/system/$SERVICE_NAME"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Check for --force or -y flag
FORCE=false
for arg in "$@"; do
  case $arg in
    -y|--yes|--force)
      FORCE=true
      shift
      ;;
  esac
done

# Confirmation prompt if not forced
if [ "$FORCE" = false ]; then
  echo ""
  echo "⚠️  WARNING: This operation will permanently remove:"
  echo "   - Systemd background service ($SERVICE_NAME)"
  echo "   - Application directory ($APP_DIR)"
  echo "   - Storage & uploaded files ($STORAGE_DIR)"
  echo "   - SQLite database, sessions, and settings"
  echo "   - Environment configurations (.env)"
  echo ""
  read -r -p "Are you sure you want to completely uninstall CloudNest? [y/N]: " response
  case "$response" in
    [yY][eE][sS]|[yY])
      echo "Proceeding with complete uninstallation..."
      ;;
    *)
      echo "❌ Uninstallation aborted by user."
      exit 0
      ;;
  esac
fi

echo ""
# ─── Step 1: Stop and disable systemd service ─────────────────────
echo "Step 1: Stopping and disabling $SERVICE_NAME..."
if systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
  systemctl stop "$SERVICE_NAME"
  echo "✓ Service stopped."
else
  echo "✓ Service was not running."
fi

if systemctl is-enabled --quiet "$SERVICE_NAME" 2>/dev/null; then
  systemctl disable "$SERVICE_NAME"
  echo "✓ Service disabled from boot."
fi

# ─── Step 2: Remove systemd service unit file ────────────────────
echo ""
echo "Step 2: Removing Systemd service configuration..."
if [ -f "$SERVICE_FILE" ]; then
  rm -f "$SERVICE_FILE"
  systemctl daemon-reload
  systemctl reset-failed 2>/dev/null || true
  echo "✓ Removed $SERVICE_FILE and reloaded systemd daemon."
else
  echo "✓ No systemd service file found at $SERVICE_FILE."
fi

# ─── Step 3: Terminate lingering processes ───────────────────────
echo ""
echo "Step 3: Checking for lingering CloudNest Node processes..."
pkill -f "cloudnest/server/index.js" 2>/dev/null || true
pkill -f "/opt/cloudnest" 2>/dev/null || true
echo "✓ Lingering processes terminated."

# ─── Step 4: Remove application directory ────────────────────────
echo ""
echo "Step 4: Removing Application directory ($APP_DIR)..."
if [ -d "$APP_DIR" ]; then
  rm -rf "$APP_DIR"
  echo "✓ Removed $APP_DIR (including node_modules, configs, and source files)."
else
  echo "✓ $APP_DIR does not exist."
fi

# ─── Step 5: Remove storage, database & data directory ───────────
echo ""
echo "Step 5: Removing Storage & Data directory ($STORAGE_DIR)..."
if [ -d "$STORAGE_DIR" ]; then
  rm -rf "$STORAGE_DIR"
  echo "✓ Removed $STORAGE_DIR (including all uploaded files, chunks, and data)."
else
  echo "✓ $STORAGE_DIR does not exist."
fi

# ─── Step 6: Clean local database/env if run from cloned repo ─────
if [ -d "$SCRIPT_DIR" ] && [ "$(realpath "$SCRIPT_DIR")" != "$(realpath "$APP_DIR" 2>/dev/null || echo "")" ]; then
  echo ""
  echo "Step 6: Cleaning local runtime artifacts from source directory..."
  rm -f "$SCRIPT_DIR/cloudnest.db"* 2>/dev/null || true
  rm -f "$SCRIPT_DIR/.env" 2>/dev/null || true
  rm -rf "$SCRIPT_DIR/.chunks" 2>/dev/null || true
  rm -rf "$SCRIPT_DIR/temp" 2>/dev/null || true
  rm -rf "$SCRIPT_DIR/logs" 2>/dev/null || true
  rm -rf "$SCRIPT_DIR/mock_storage" 2>/dev/null || true
  echo "✓ Cleaned local db, env, chunks, logs, and mock storage artifacts."
fi

# ─── Step 7: Completion status ───────────────────────────────────
echo ""
echo "============================================================="
echo " ✅ CloudNest has been completely and cleanly uninstalled!"
echo "============================================================="
echo " - Systemd Service : REMOVED"
echo " - App Files       : REMOVED"
echo " - Database & Env  : REMOVED"
echo " - Storage Data    : REMOVED"
echo "============================================================="
