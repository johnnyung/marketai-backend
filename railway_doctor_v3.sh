#!/bin/bash
set -e

echo "====================================================="
echo " 🚑  RAILWAY DOCTOR v3 — Working CLI Version"
echo "====================================================="

echo ""
echo "STEP 1 — Detecting local build integrity..."
if [ ! -f "dist/server.js" ]; then
  echo "❌ dist/server.js missing — rebuilding..."
  npm run build
else
  echo "✔ dist/server.js found"
fi

echo ""
echo "STEP 2 — Checking package.json start script..."
START_CMD=$(jq -r '.scripts.start' package.json)
echo "Current start script: $START_CMD"

if [[ "$START_CMD" != "node dist/server.js" ]]; then
  echo "⚠️ Incorrect start script — fixing now..."
  jq '.scripts.start="node dist/server.js"' package.json > package.tmp.json
  mv package.tmp.json package.json
  echo "✔ Start script fixed"
else
  echo "✔ Start script OK"
fi

echo ""
echo "STEP 3 — Creating Procfile & railway.toml..."
echo "web: node dist/server.js" > Procfile

cat > railway.toml << 'TOML'
[build]
builder = "NIXPACKS"

[deploy]
start = "node dist/server.js"
TOML

echo "✔ Procfile + railway.toml updated"

echo ""
echo "====================================================="
echo " STEP 4 — REMOTE RAILWAY CONTAINER INSPECTION"
echo "====================================================="
echo ""
echo "Connecting to Railway… (if this hangs, your service is not running)"

echo "👉 Checking processes..."
railway shell "ps aux | grep node || true"

echo ""
echo "👉 Checking for /app/dist..."
railway shell "ls -R /app/dist || echo '❌ /app/dist missing — build output not deployed'"

echo ""
echo "👉 Checking environment variables..."
railway shell "printenv | sort | grep -E 'PORT|NODE|DATABASE|FMP' || true"

echo ""
echo "👉 Checking what is listening on port 8080..."
railway shell "netstat -tulnp 2>/dev/null || ss -tulnp 2>/dev/null || echo 'netstat/ss unavailable'"

echo ""
echo "====================================================="
echo " SUMMARY — What we are looking for:"
echo "-----------------------------------------------------"
echo "✔ If ps aux does NOT show 'node dist/server.js' → server never launched"
echo "✔ If /app/dist is EMPTY → Nixpacks build failed"
echo "✔ If PORT is missing/wrong → server cannot bind"
echo "✔ If no process is listening on 8080 → Express never ran"
echo "====================================================="
echo ""
echo "After fixing:"
echo "  git add ."
echo "  git commit -m 'Railway Doctor v3 fixes'"
echo "  git push"
echo ""
