#!/bin/bash
set -e

echo "==============================================="
echo " 🔧 Repairing debugCrash import and mount"
echo "==============================================="

SERVER="src/server.ts"

echo "📄 Cleaning previous broken injection..."
# Remove any broken or partial references
sed -i '' '/debugCrash/d' $SERVER

echo "📄 Re-inserting correct import..."
# Insert import AFTER the last existing import line
sed -i '' '/^import .* from .*;$/!b; n; i\
import debugCrash from "./routes/debugCrash.js";
' $SERVER

echo "📄 Re-inserting correct mount..."
# Insert mount AFTER other app.use routes
sed -i '' '/app.use(.*api\/brain/ a\
app.use("/debug", debugCrash);
' $SERVER

echo "🏗 Rebuilding..."
npm run build

echo "==============================================="
echo " ✅ DONE — Now git add/commit/push"
echo " Then run:  curl <railway>/debug/crash-scan"
echo "==============================================="
