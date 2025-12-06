#!/bin/bash
set -e

echo "==============================================="
echo " 🔧 Repairing debugCrash import & mount (v3 — macOS SAFE)"
echo "==============================================="

SERVER="src/server.ts"
TEMP="src/server.ts.tmp"

echo "📄 Cleaning previous injections..."
grep -v "debugCrash" "$SERVER" > "$TEMP"

echo "📄 Reinserting correct import..."
# Insert import directly after the LAST existing import line
awk '
  /^import / { last_import=NR }
  { lines[NR]=$0 }
  END {
    for (i=1; i<=NR; i++) {
      print lines[i]
      if (i == last_import) {
        print "import debugCrash from \"./routes/debugCrash.js\";"
      }
    }
  }
' "$TEMP" > "$SERVER"

rm "$TEMP"

echo "📄 Reinserting route mount..."
# Insert after the /api/brain route using awk
awk '
  { print }
  /app.use\(.*api\/brain/ {
    print "app.use(\"/debug\", debugCrash);"
  }
' "$SERVER" > "$TEMP" && mv "$TEMP" "$SERVER"

echo "🏗 Rebuilding..."
npm run build

echo "==============================================="
echo " ✅ DONE — Now git add/commit/push"
echo " Run after deploy:"
echo "   curl https://marketai-backend-production-b474.up.railway.app/debug/crash-scan"
echo "==============================================="
