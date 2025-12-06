#!/bin/bash
set -e

echo "====================================================="
echo " 🚑  MARKETAI RAILWAY BACKEND RESCUE SCRIPT"
echo "====================================================="

### 1 — VERIFY dist/server.js EXISTS
echo "🔍 Checking dist/server.js..."
if [ ! -f "dist/server.js" ]; then
  echo "❌ dist/server.js not found — rebuilding..."
  npm run build
else
  echo "✔ dist/server.js exists"
fi

### 2 — VERIFY package.json START SCRIPT
echo "🔍 Checking package.json start script..."

CURRENT_START=$(jq -r '.scripts.start' package.json)

if [[ "$CURRENT_START" != "node dist/server.js" ]]; then
  echo "⚠️ start script incorrect. Fixing..."
  jq '.scripts.start="node dist/server.js"' package.json > package.tmp.json
  mv package.tmp.json package.json
  echo "✔ start script set to 'node dist/server.js'"
else
  echo "✔ start script already correct"
fi

### 3 — CREATE Procfile (forces Railway to run Node)
echo "🔧 Creating Procfile..."
echo "web: node dist/server.js" > Procfile
echo "✔ Procfile created"

### 4 — CREATE railway.toml (forces NIXPACKS Node builder)
echo "🔧 Creating railway.toml..."
cat > railway.toml << 'TOML'
[build]
builder = "NIXPACKS"

[deploy]
start = "node dist/server.js"
TOML
echo "✔ railway.toml created"

### 5 — DETECT COMMON RAILWAY MISCONFIGURATION
echo "🔍 Checking for common Railway misconfigurations..."

if [ -f ".railway/config.json" ]; then
  echo "⚠️ Old .railway config found — Railway often ignores repo runtime with this present."
  echo "   You may delete it if deployment still fails."
else
  echo "✔ No legacy .railway config interfering"
fi

### 6 — SHOW DEPLOYMENT SUMMARY
echo "====================================================="
echo " 🔧 FIX COMPLETE"
echo "====================================================="

echo "Next steps:"
echo "  1. git add ."
echo "  2. git commit -m 'Restore Railway backend runtime'"
echo "  3. git push"
echo "  4. Go to Railway → Deployments → Redeploy Now"
echo ""
echo "After deploy, test:"
echo "  curl -I https://marketai-backend-production-397e.up.railway.app/api/health"
echo ""
echo "====================================================="
echo "If you still see 404 fallback → Railway is ignoring your repo runtime."
echo "This script forces Railway to respect a Node environment."
echo "====================================================="
