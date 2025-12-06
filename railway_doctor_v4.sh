#!/usr/bin/env bash
set -e

echo "====================================================="
echo " 🚑  RAILWAY DOCTOR v4 — Interactive Shell Auto-Inspector"
echo "====================================================="

echo ""
echo "STEP 1 — Local build check..."
if [ ! -f "dist/server.js" ]; then
  echo "❌ dist/server.js missing — rebuilding..."
  npm run build
else
  echo "✔ dist/server.js exists"
fi

echo ""
echo "STEP 2 — Checking start script..."
START_CMD=$(jq -r '.scripts.start' package.json)
echo "Current start script: $START_CMD"
if [[ "$START_CMD" != "node dist/server.js" ]]; then
  echo "⚠️ Fixing start script..."
  jq '.scripts.start="node dist/server.js"' package.json > package.tmp.json
  mv package.tmp.json package.json
  echo "✔ start script repaired"
else
  echo "✔ start script OK"
fi

echo ""
echo "STEP 3 — Preparing remote diagnostic script..."
cat > .railway_remote_doctor.sh << 'EOSHELL'
echo "================= RAILWAY REMOTE DOCTOR ==============="
echo ""
echo "👉 PROCESS LIST"
ps aux | grep node
echo ""
echo "👉 DIST FOLDER"
ls -R /app/dist || echo "❌ dist folder missing"
echo ""
echo "👉 ENVIRONMENT VARIABLES"
printenv | sort
echo ""
echo "👉 PORTS LISTENING"
netstat -tulnp 2>/dev/null || ss -tulnp 2>/dev/null
echo ""
echo "========================================================"
echo "   END OF REMOTE REPORT"
echo "========================================================"
EOSHELL

echo "✔ Remote diagnostic script prepared"

echo ""
echo "STEP 4 — Executing remote commands over Railway shell..."
echo "This will take ~3–5 seconds…"

expect << 'EOFEXP'
set timeout 20

spawn railway shell

expect "Entering shell"
send "bash .railway_remote_doctor.sh\r"

expect "END OF REMOTE REPORT"
send "exit\r"

EOFEXP

echo ""
echo "====================================================="
echo "   ✅ Railway Doctor v4 complete"
echo "====================================================="
