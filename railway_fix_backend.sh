#!/usr/bin/env bash
set -e

echo "====================================================="
echo " 🚑 RAILWAY BACKEND FIXER — FULL AUTO REPAIR"
echo "====================================================="

# -------------------------------
# STEP 1: DELETE ALL DOCKERFILES
# -------------------------------
echo ""
echo "STEP 1 — Scanning for Dockerfiles…"

FOUND=0
for df in Dockerfile dockerfile DockerFile; do
  if [ -f "$df" ]; then
    echo "❗ Found Dockerfile: $df — removing it"
    rm -f "$df"
    FOUND=1
  fi
done

if [ $FOUND -eq 0 ]; then
  echo "✔ No Dockerfile found (good)"
else
  echo "✔ All Dockerfiles removed"
fi

# -------------------------------
# STEP 2: FORCE VALID Procfile
# -------------------------------
echo ""
echo "STEP 2 — Writing guaranteed-good Procfile…"

echo "web: node dist/server.js" > Procfile
echo "✔ Procfile written"

# -------------------------------
# STEP 3: FORCE VALID start SCRIPT
# -------------------------------
echo ""
echo "STEP 3 — Fixing package.json start script…"

if command -v jq >/dev/null 2>&1; then
  jq '.scripts.start="node dist/server.js"' package.json > package.tmp.json
  mv package.tmp.json package.json
  echo "✔ package.json start script fixed"
else
  echo "❌ jq not installed — run: brew install jq"
  exit 1
fi

# -------------------------------
# STEP 4: REBUILD DIST
# -------------------------------
echo ""
echo "STEP 4 — Rebuilding dist folder…"
npm run build
echo "✔ Local build complete"

# -------------------------------
# STEP 5: COMMIT & PUSH
# -------------------------------
echo ""
echo "STEP 5 — Committing & pushing changes…"

git add .
git commit -m "Railway Fix: remove Dockerfile + enforce Nixpacks runtime" || true
git push

echo "✔ Changes pushed"

# -------------------------------
# STEP 6: TRIGGER RAILWAY DEPLOY
# -------------------------------
echo ""
echo "STEP 6 — Triggering Railway Redeploy…"
railway redeploy || railway up || true
echo "✔ Redeploy requested"

# -------------------------------
# STEP 7: POLL /api/health
# -------------------------------
echo ""
echo "STEP 7 — Checking backend health until online…"

HEALTH_URL="https://marketai-backend-production-397e.up.railway.app/api/health"

ATTEMPTS=20
SLEEP=5

for ((i=1; i<=ATTEMPTS; i++)); do
  echo "→ Checking health ($i/$ATTEMPTS)…"
  
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" || true)

  if [ "$STATUS" == "200" ] || [ "$STATUS" == "204" ]; then
    echo ""
    echo "====================================================="
    echo " 🎉 SUCCESS! MarketAI backend is ONLINE"
    echo "====================================================="
    exit 0
  fi

  sleep $SLEEP
done

echo ""
echo "====================================================="
echo " ❌ Backend still not responding — check logs manually"
echo "====================================================="
exit 1

