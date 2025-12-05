#!/bin/bash
set -e

# Determine backend root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${ROOT_DIR}"

echo ">>> Building backend..."
npm run build

echo ">>> Running FMP core verification..."
if [ -f "dist/scripts/verifyFmpCore.js" ]; then
    node -r dotenv/config dist/scripts/verifyFmpCore.js
else
    echo "❌ CRITICAL: compiled script not found."
    exit 1
fi

echo "✅ Check Passed."
