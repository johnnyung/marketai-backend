#!/bin/bash
set -e

# Resolve paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${ROOT_DIR}"

echo ">>> Building..."
npm run build

echo ">>> Running FDV-5 Verification..."
if [ -f "dist/scripts/verify_sentiment_fdv5.js" ]; then
    node -r dotenv/config dist/scripts/verify_sentiment_fdv5.js
else
    echo "❌ Script not found. Build failed?"
    exit 1
fi
