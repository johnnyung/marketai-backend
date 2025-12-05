#!/bin/bash
set -e

echo "============================================================"
echo "  MARKETAI — PATCH dist/server.js FOR .js EXTENSIONS"
echo "============================================================"

DIST_SERVER="dist/server.js"
DIST_ROUTES="dist/routes"

if [ ! -f "$DIST_SERVER" ]; then
  echo "❌ dist/server.js not found. Run: npm run build"
  exit 1
fi

echo "🔧 Patching route imports…"

# Find all import lines that reference ./routes/<name>
IMPORT_LINES=$(grep -n "from './routes/" "$DIST_SERVER" | cut -d: -f1)

if [ -z "$IMPORT_LINES" ]; then
  echo "❌ No route imports found in dist/server.js"
  exit 1
fi

# Append .js to each import path
sed -i '' "s|from './routes/|from './routes/|g" "$DIST_SERVER"
sed -i '' "s|\('./routes/[a-zA-Z0-9_-]*'\)|\1 + '.js'|g" "$DIST_SERVER"

# Simpler: direct replace missing .js endings
sed -i '' "s|from './routes/\([a-zA-Z0-9_-]*\)'|from './routes/\1.js'|g" "$DIST_SERVER"

echo "🔍 Validating…"

for f in $DIST_ROUTES/*.js; do
  NAME=$(basename "$f" .js)

  if ! grep -q "./routes/${NAME}.js" "$DIST_SERVER"; then
    echo "❌ Missing import for ${NAME}.js"
  fi
done

echo "============================================================"
echo "  ✅ Patch Complete — dist/server.js updated"
echo "============================================================"
