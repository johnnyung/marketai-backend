#!/bin/bash
set -e

echo "========================================="
echo " MARKETAI — ROUTE PURGE & CLEAN REBUILD"
echo "========================================="

ROUTES="src/routes"
DIST_ROUTES="dist/routes"

echo "🔍 Checking for legacy/broken route files in dist..."

# Remove known bad legacy files
BAD_FILES=(
  auth.js
  ai.js
  intelligence.js
  data.js
  digest.js
  news.js
)

for f in "${BAD_FILES[@]}"; do
  if [ -f "$DIST_ROUTES/$f" ]; then
    echo "❌ Removing legacy $f"
    rm "$DIST_ROUTES/$f"
  fi
done

echo ""
echo "🔧 Removing ALL dist folder to guarantee a clean rebuild"
rm -rf dist

echo "📦 Reinstalling & rebuilding..."
npm install --silent
npm run build

echo ""
echo "========================================="
echo " CLEAN REBUILD COMPLETE"
echo " IMPORTANT:"
echo "   • git add ."
echo "   • git commit -m 'Purge legacy routes'"
echo "   • git push"
echo "   • Railway will deploy CLEAN dist"
echo "========================================="
