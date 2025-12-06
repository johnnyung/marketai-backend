#!/bin/bash
set -e

echo "=============================================="
echo "   MARKETAI — FORCE CORRECT RAILWAY ENTRYPOINT"
echo "=============================================="

BACKEND="$HOME/Desktop/marketai-backend"

cd "$BACKEND"

echo "🔧 Removing old bootstrap files..."
rm -f src/bootstrap.ts || true
rm -f dist/bootstrap.js || true

echo "🔧 Forcing package.json start = node dist/server.js"

cp package.json package.json.bak

if command -v jq >/dev/null 2>&1; then
  jq '.scripts.start = "node dist/server.js"' package.json > package.json.tmp
  mv package.json.tmp package.json
else
  sed -i '' 's#"start":.*#"start": "node dist/server.js",#' package.json
fi

echo "📄 Current start script:"
grep '"start"' package.json

echo "🧹 Cleaning build artifacts..."
rm -rf dist node_modules package-lock.json

echo "📦 Reinstalling..."
npm install

echo "🏗 Rebuilding..."
npm run build

echo "=============================================="
echo " FIX COMPLETE — NEXT STEPS:"
echo "  1. git add ."
echo "  2. git commit -m 'Force correct Railway entrypoint'"
echo "  3. git push"
echo ""
echo "🚀 Railway WILL deploy using dist/server.js"
echo "=============================================="
