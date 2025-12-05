#!/bin/bash

# ============================================================
# MARKET_AI — REPAIR INGEST (HEALTH + FULL A)
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

hit() {
  local method="$1"
  local path="$2"
  local label="$3"

  echo "------------------------------------------------------------"
  echo "▶ $label"
  echo "   $method $BASE_URL$path"
  echo "------------------------------------------------------------"
  if [ "$method" = "GET" ]; then
    curl -sS -X GET "$BASE_URL$path" -H "Content-Type: application/json" || echo "⚠️  curl error"
  else
    curl -sS -X "$method" "$BASE_URL$path" -H "Content-Type: application/json" || echo "⚠️  curl error"
  fi
  echo
  echo
}

echo "============================================================"
echo "  STEP 1 — BASIC HEALTH CHECKS"
echo "============================================================"

hit "GET" "/health" "Backend /health"
hit "GET" "/intelligence/health" "Intelligence /health (if implemented)" || true

echo "============================================================"
echo "  STEP 2 — RUN FULL INGEST (OPTION A)"
echo "============================================================"

bash scripts/run_full_ingest.sh

echo
echo "✅ REPAIR INGEST COMPLETED."
