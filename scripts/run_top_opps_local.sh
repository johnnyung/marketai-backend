#!/bin/bash

# ============================================================
# MARKET_AI — TOP OPPORTUNITIES LOCAL VIEW
# ============================================================

TARGET_DIR="$HOME/Desktop/marketai-backend"
BASE_URL="${BASE_URL:-http://localhost:8080}"

cd "$TARGET_DIR" || {
  echo "❌ Could not cd into $TARGET_DIR"
  exit 1
}

HAS_JQ=false
if command -v jq >/dev/null 2>&1; then
  HAS_JQ=true
fi

echo "✅ Operational Context: $(pwd)"
echo "🌐 Using BASE_URL = $BASE_URL"
echo

try_route() {
  local path="$1"
  echo "------------------------------------------------------------"
  echo "▶ Trying GET $BASE_URL$path"
  echo "------------------------------------------------------------"

  if $HAS_JQ; then
    http_code=$(curl -sS -o /tmp/top_opps.json -w "%{http_code}" "$BASE_URL$path" || echo "000")
    echo "HTTP $http_code"
    if [ "$http_code" = "200" ]; then
      echo
      echo "📊 Top opportunities (pretty):"
      cat /tmp/top_opps.json | jq '.'
    else
      echo "⚠️  Non-200 response. Raw:"
      cat /tmp/top_opps.json
    fi
  else
    echo "ℹ️  jq not installed, showing raw JSON"
    curl -sS "$BASE_URL$path" || echo "⚠️  curl error"
  fi

  echo
}

echo "============================================================"
echo "  TOP OPPORTUNITIES SNAPSHOT"
echo "============================================================"

# 1. Our A14 route on tradingOpportunitiesRoutes.ts
try_route "/trading-opportunities/top"

# 2. Fallback: if router is mounted under /opportunities
try_route "/opportunities/top"

echo "✅ Done."
