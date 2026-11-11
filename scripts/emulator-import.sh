#!/bin/bash
# Start Firebase Emulator with data persistence import/export
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATA_DIR="${1:-$DIR/.firebase-emulator-data}"

echo "==> Starting Firebase Emulators with persistence dir: $DATA_DIR"
mkdir -p "$DATA_DIR"

if command -v firebase &> /dev/null; then
  firebase emulators:start --import="$DATA_DIR" --export-on-exit="$DATA_DIR"
else
  echo "==> Error: 'firebase' CLI not found on PATH. Install with: npm i -g firebase-tools"
  exit 1
fi
