#!/usr/bin/env bash
# Build iHIMS Desktop Installer — Linux / macOS
# Usage: ./scripts/build-installer.sh [windows|mac|linux]

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
API_DIR="$ROOT/apps/api"
WEB_DIR="$ROOT/apps/web"
DESKTOP_DIR="$ROOT/apps/desktop"
TARGET="${1:-$(uname -s | tr '[:upper:]' '[:lower:]')}"

echo ""
echo "======================================="
echo " iHIMS Desktop Installer Build"
echo "======================================="
echo " Root:    $ROOT"
echo " Target:  $TARGET"
echo ""

# Step 1: Install npm dependencies
echo "[1/5] Installing dependencies..."
cd "$ROOT" && npm install

# Step 2: Build API TypeScript
echo ""
echo "[2/5] Building API TypeScript..."
cd "$API_DIR" && npx tsc -p tsconfig.build.json

# Step 3: Bundle API as sidecar
echo ""
echo "[3/5] Building API sidecar binary..."
cd "$DESKTOP_DIR" && node scripts/prepare-api-sidecar.js

# Step 4: Build web frontend
echo ""
echo "[4/5] Building web frontend..."
cd "$WEB_DIR"
VITE_API_BASE_URL="http://localhost:3001/api" npm run build
rm -rf "$DESKTOP_DIR/dist"
cp -r "$WEB_DIR/dist" "$DESKTOP_DIR/dist"
echo "  Copied web dist → apps/desktop/dist"

# Step 5: Build Tauri installer
echo ""
echo "[5/5] Building Tauri installer..."
cd "$DESKTOP_DIR"

case "$TARGET" in
  windows) cargo tauri build --target x86_64-pc-windows-msvc ;;
  mac|darwin) cargo tauri build --target x86_64-apple-darwin ;;
  linux) cargo tauri build --target x86_64-unknown-linux-gnu ;;
  *) cargo tauri build ;;
esac

echo ""
echo "======================================="
echo " Build Complete!"
echo "======================================="
echo ""
echo "Installer artifacts:"
find "$DESKTOP_DIR/src-tauri/target/release/bundle" \
  -name "*.exe" -o -name "*.msi" -o -name "*.dmg" -o \
  -name "*.AppImage" -o -name "*.deb" -o -name "*.rpm" \
  2>/dev/null | while read -r f; do echo "  $f"; done
