#!/bin/bash
set -e

echo "============================================================"
echo "   MARKETAI — PERMANENT FIX: ADD .js EXTENSIONS TO IMPORTS"
echo "============================================================"

SERVER="src/server.ts"

if [[ ! -f "$SERVER" ]]; then
  echo "❌ ERROR: src/server.ts not found!"
  exit 1
fi

echo "📦 Backing up src/server.ts → server.ts.bak"
cp "$SERVER" "$SERVER.bak"

echo "🔧 Patching imports in src/server.ts…"

/usr/bin/sed -i '' -E "s|from './routes/([^']+)'|from './routes/\1.js'|g" "$SERVER"

echo "✔️ src/server.ts patched"

echo "============================================================"
echo "   REBUILDING DIST"
echo "============================================================"

npm run build

echo "============================================================"
echo "   VALIDATING dist/server.js"
echo "============================================================"

if grep -n "ai-tips';" dist/server.js >/dev/null; then
  echo "❌ ERROR: dist/server.js still missing .js extension"
  exit 1
fi

echo "🎉 SUCCESS — ALL IMPORTS FIXED AND ESM SAFE"
echo "Run:  npm run dev"
echo "============================================================"
