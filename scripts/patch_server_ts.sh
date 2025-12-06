#!/bin/bash
set -e

SERVER="src/server.ts"

echo "🔧 Patching $SERVER ..."

# Remove old health imports
sed -i '' '/healthRoutes/d' "$SERVER"

# Insert correct import at top
sed -i '' '1s/^/import healthRoutes from ".\/routes\/health.js";\n/' "$SERVER"

# Remove old app.use("/api/health"...)
sed -i '' '/api\/health/d' "$SERVER"

# Ensure route is registered (only once)
if ! grep -q 'app.use("/api", healthRoutes)' "$SERVER"; then
  echo 'app.use("/api", healthRoutes);' >> "$SERVER"
fi

echo "✅ server.ts patched"
