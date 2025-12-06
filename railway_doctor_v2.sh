#!/bin/bash
set -e

echo "====================================================="
echo " 🚑  RAILWAY DOCTOR v2 — Full Backend Diagnostics"
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
  echo "✔ Fixed start script"
else
  echo "✔ Start script OK"
fi

echo ""
echo "STEP 3 — Verifying Procfile..."
if [ ! -f "Procfile" ]; then
  echo "Creating Procfile..."
  echo "web: node dist/server.js" > Procfile
fi
echo "✔ Procfile set"

echo ""
echo "STEP 4 — Verifying railway.toml..."
cat > railway.toml << 'TOML'
[build]
builder = "NIXPACKS"

[deploy]
start = "node dist/server.js"
TOML
echo "✔ railway.toml updated"

echo ""
echo "STEP 5 — RUNNING REMOTE RAILWAY INSPECTION..."
echo "   (This uses 'railway shell' to inspect the LIVE container)"
echo ""

echo "➤ Checking what file Railway is actually running..."
railway shells exec "ps aux | grep node || true"

echo ""
echo "➤ Checking if dist exists **inside Railway**..."
railway shells exec "ls -R /app/dist || echo '❌ dist folder missing inside container'"

echo ""
echo "➤ Checking PORT, ENV, ENTRYPOINT inside Railway..."
railway shells exec "echo 'PORT='$PORT; printenv | sort;"

echo ""
echo "STEP 6 — Doctor Summary"
echo "====================================================="
echo "If ps aux DOES NOT show 'node dist/server.js' → Railway is NOT starting your server"
echo "If /app/dist is EMPTY → Railway build failed"
echo "If PORT is wrong → Express will not bind"
echo ""
echo "Next steps after this script:"
echo "  git add ."
echo "  git commit -m 'Railway Doctor v2 fixes'"
echo "  git push"
echo ""
echo "Then go to Railway → Deployments → Redeploy"
echo "====================================================="
