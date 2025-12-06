#!/bin/bash
set -e

echo "🔧 Updating package.json for correct Railway entrypoint..."

# Use jq if installed, otherwise fallback to sed
if command -v jq >/dev/null 2>&1; then
  cp package.json package.json.bak
  jq '.scripts.start = "node dist/server.js"' package.json > package.json.tmp
  mv package.json.tmp package.json
else
  # sed fallback (macOS compatible)
  cp package.json package.json.bak
  sed -i '' 's#"start":.*#"start": "node dist/server.js",#' package.json
fi

echo "✅ package.json updated:"
grep '"start"' package.json

echo ""
echo "💡 NEXT:"
echo "  1. git add ."
echo "  2. git commit -m 'Fix Railway entrypoint'"
echo "  3. git push"
echo "  4. Railway will deploy using dist/server.js"
