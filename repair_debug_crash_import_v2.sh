#!/bin/bash
set -e

echo "==============================================="
echo " 🔧 Repairing debugCrash import and mount (macOS-safe)"
echo "==============================================="

SERVER="src/server.ts"

echo "📄 Cleaning previous broken injection..."
sed -i '' '/debugCrash/d' "$SERVER"

echo "📄 Inserting correct import..."
# Insert import just BELOW the *last* import statement
# This uses BSD-sed safe syntax
sed -i '' '/^import .* from .*;$/ {
  $!N
  s/$/\\
import debugCrash from ".\/routes\/debugCrash.js";/
}' "$SERVER"

echo "📄 Inserting correct mount..."
# Append mount after /api/brain route using BSD-safe syntax
sed -i '' '/app.use(.*api\/brain.*)/a\
app.use("/debug", debugCrash);
' "$SERVER"

echo "🏗 Rebuilding..."
npm run build

echo "==============================================="
echo " ✅ DONE — Now git add/commit/push"
echo " Then run:"
echo " curl https://marketai-backend-production-b474.up.railway.app/debug/crash-scan"
echo "==============================================="
