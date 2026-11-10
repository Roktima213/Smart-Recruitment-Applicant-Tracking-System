#!/usr/bin/env bash
# ==============================================================================
# Automated SQL Migration Runner for Unix/Linux/CI environments
# ==============================================================================
set -e

echo "============================================================"
echo "Executing Smart ATS Database Migrations..."
echo "============================================================"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
npx ts-node "$SCRIPT_DIR/migrate.ts"
