#!/bin/bash
set -e

FILE="src/server.ts"

echo "=============================================="
echo "   MARKETAI — CLEAN PORT/LISTEN FIX"
echo "=============================================="

if [ ! -f "$FILE" ]; then
  echo "❌ Cannot find $FILE"
  exit 1
fi

# Remove all old listen lines first
sed -i '' '/app.listen/,+5d' "$FILE"

# Append correct block at end of file
cat >> "$FILE" << 'EOS'

// --------------------------------------------------
// 🚀 Server Listen — REQUIRED for Railway Deployment
// --------------------------------------------------
const PORT = Number(process.env.PORT) || 8080;

app.listen(PORT, "0.0.0.0", () => {
  console.log(\`🚀 Server running on port \${PORT} (bound to 0.0.0.0)\`);
});
EOS

echo "🔧 server.ts cleaned + patched successfully"
echo "🏗 Rebuilding..."
npm run build

echo ""
echo "=============================================="
echo " FIX COMPLETE — NEXT STEPS:"
echo "  1. git add ."
echo "  2. git commit -m \"Clean port fix for Railway\""
echo "  3. git push"
echo "=============================================="
