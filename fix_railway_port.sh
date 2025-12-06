#!/bin/bash
set -e

FILE="src/server.ts"

echo "=============================================="
echo "   MARKETAI — FIXING RAILWAY PORT BINDING"
echo "=============================================="

if [ ! -f "$FILE" ]; then
  echo "❌ Cannot find $FILE"
  exit 1
fi

# Replace listen block
sed -i '' 's/app.listen(.*$/const PORT = Number(process.env.PORT) || 8080;\
app.listen(PORT, "0.0.0.0", () => {\
  console.log(`🚀 Server running and listening on *:${PORT}`);\
});/' "$FILE"

echo "🔧 server.ts patched successfully"
echo "🏗 Rebuilding..."

npm run build

echo ""
echo "=============================================="
echo " FIX COMPLETE — NEXT STEPS:"
echo "  1. git add ."
echo "  2. git commit -m \"Fix Railway port binding\""
echo "  3. git push"
echo "=============================================="
