#!/bin/bash

echo "🧹 FORCING CLEAN DEPLOYMENT"
echo "==========================="
echo ""
echo "This will:"
echo "1. Copy the fixed intelligence.ts"
echo "2. Delete dist/ folder to force rebuild"
echo "3. Clear Railway cache"
echo "4. Deploy with fresh compilation"
echo ""

# Check directory
if [ ! -d "src/routes" ]; then
    echo "❌ ERROR: Run this from marketai-backend directory!"
    echo "   cd ~/Desktop/marketai-backend"
    exit 1
fi

echo "📋 Step 1: Copying fixed intelligence.ts..."
cp ~/Desktop/marketai-daily-intelligence-basic/backend/routes/intelligence.ts src/routes/
cp ~/Desktop/marketai-daily-intelligence-basic/.railwayignore .
echo "✅ Files copied"
echo ""

echo "🗑️  Step 2: Deleting old compiled code..."
rm -rf dist/
rm -rf node_modules/.cache/
rm -rf .tsbuildinfo
echo "✅ Old build artifacts deleted"
echo ""

echo "🔍 Step 3: Verifying source file..."
if grep -q "fp.direction" src/routes/intelligence.ts; then
    echo "❌ ERROR: File still has fp.direction in query!"
    echo "Something is wrong. Check the file manually."
    exit 1
fi
echo "✅ Source file verified (no fp.direction in query)"
echo ""

echo "🚀 Step 4: Deploying with FORCE flag..."
echo ""
railway up --force

echo ""
echo "✅ DEPLOYMENT COMPLETE!"
echo ""
echo "🔍 Check if it worked:"
echo "   railway logs | grep -A 5 'Intelligence generation'"
echo ""
echo "Should see:"
echo "   ✅ 'Intelligence generated and cached'"
echo "   ❌ NO 'column fp.direction does not exist'"
