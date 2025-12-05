#!/bin/bash
set -e

# Resolve paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${ROOT_DIR}"

echo ">>> Building..."
npm run build

echo ">>> Running FDV-4 Verification..."
if [ -f "dist/scripts/verify_historical_fdv4.js" ]; then
    node -r dotenv/config dist/scripts/verify_historical_fdv4.js
else
    echo "❌ Script not found. Build failed?"
    exit 1
fi
