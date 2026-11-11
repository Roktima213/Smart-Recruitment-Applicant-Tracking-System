#!/bin/bash
# Export Firebase Auth Emulator state to local directory
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_DIR="${1:-$DIR/.firebase-emulator-data}"

echo "==> Exporting Firebase Emulator data to: $TARGET_DIR"
mkdir -p "$TARGET_DIR"

if command -v firebase &> /dev/null; then
  firebase emulators:export "$TARGET_DIR" --force
  echo "==> Export complete successfully."
else
  echo "==> Error: 'firebase' CLI not found on PATH. Install with: npm i -g firebase-tools"
  exit 1
fi
