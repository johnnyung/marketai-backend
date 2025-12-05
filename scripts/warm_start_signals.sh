#!/bin/bash

# ============================================================
# MARKET_AI — WARM START SIGNALS (FULL PIPELINE HIT)
# ============================================================

TARGET_DIR="$HOME/Desktop/marketai-backend"
BASE_URL="${BASE_URL:-http://localhost:8080}"

cd "$TARGET_DIR" || {
  echo "❌ Could not cd into $TARGET_DIR"
  exit 1
}

echo "✅ Operational Context: $(pwd)"
echo "🌐 Using BASE_URL = $BASE_URL"
echo "   (override by: BASE_URL=http://yourhost:port ./scripts/warm_start_signals.sh)"
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
echo "  STEP 1 — REFRESH PRICES & RAW INTELLIGENCE"
echo "============================================================"

# 1. Refresh prices / cache
hit "POST" "/intelligence/update-prices" "Update prices (price_cache, stock_historical_prices)"

# 2. Ingest social sentiment / Reddit / news (if wired)
hit "POST" "/social-intelligence/ingest" "Ingest social & news intelligence"

# 3. Optional: regenerate daily intelligence
hit "POST" "/daily/generate" "Generate daily intelligence report"

echo "============================================================"
echo "  STEP 2 — GENERATE TRADING SIGNALS & OPPORTUNITIES"
echo "============================================================"

# 4. Generate AI trading signals (core engine)
hit "POST" "/intelligence/generate-signals" "Generate AI trading signals"

# 5. Ingest / rebuild opportunities table from filings & signals
hit "POST" "/opportunities/ingest" "Ingest / rebuild opportunities from SEC + signals"

# 6. Run catalyst hunter / pattern engines
hit "POST" "/analytics/hunt-catalysts" "Run catalyst hunter on fresh data"

echo "============================================================"
echo "  STEP 3 — UNIFIED INTELLIGENCE / HEALTH PING"
echo "============================================================"

# 7. Ping unified intelligence (may compute alerts/performance)
hit "GET" "/unified-intelligence/alerts" "Check unified intelligence alerts"

echo "✅ Warm start sequence completed."
