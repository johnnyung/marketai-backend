#!/bin/bash

# ============================================================
# MARKET_AI — FULL INGEST (OPTION A)
# ============================================================

TARGET_DIR="$HOME/Desktop/marketai-backend"
BASE_URL="${BASE_URL:-http://localhost:8080}"

cd "$TARGET_DIR" || {
  echo "❌ Could not cd into $TARGET_DIR"
  exit 1
}

echo "✅ Operational Context: $(pwd)"
echo "🌐 Using BASE_URL = $BASE_URL"
echo

echo "============================================================"
echo "  STEP 0 — BUILD BACKEND (TS -> JS)"
echo "============================================================"

npm run build || {
  echo "❌ Build failed. Fix build errors first."
  exit 1
}

echo
echo "============================================================"
echo "  STEP 1 — WARM START SIGNALS & OPPORTUNITIES"
echo "============================================================"

bash scripts/warm_start_signals.sh || {
  echo "⚠️  warm_start_signals.sh reported issues."
}

echo
echo "============================================================"
echo "  STEP 2 — OPTIONAL: DAILY / STORY / META ROUTES"
echo "============================================================"

BASE_URL="$BASE_URL" bash -c '
  hit() {
    local method="$1"
    local path="$2"
    local label="$3"
    echo "------------------------------------------------------------"
    echo "▶ $label"
    echo "   $method '"$BASE_URL"'$path"
    echo "------------------------------------------------------------"
    if [ "$method" = "GET" ]; then
      curl -sS -X GET "'"$BASE_URL"'$path" -H "Content-Type: application/json" || echo "⚠️  curl error"
    else
      curl -sS -X "$method" "'"$BASE_URL"'$path" -H "Content-Type: application/json" || echo "⚠️  curl error"
    fi
    echo
    echo
  }

  # Hit a couple of extra intelligence endpoints to warm caches
  hit "GET" "/intelligence/signals" "Fetch current signals (sanity check)"
  hit "GET" "/opportunities/recent" "Fetch recent opportunities"
' || echo "⚠️  Optional cache warmers had issues."

echo
echo "============================================================"
echo "  STEP 3 — FINAL CHECK: TOP OPPORTUNITIES SNAPSHOT"
echo "============================================================"

if [ -x "scripts/verify_engines/verify_a14_top_opps.sh" ]; then
  scripts/verify_engines/verify_a14_top_opps.sh
else
  echo "ℹ️  A14 verifier not found; you can still curl /trading-opportunities/top manually."
fi

echo
echo "✅ FULL INGEST (OPTION A) SCRIPT COMPLETED."
