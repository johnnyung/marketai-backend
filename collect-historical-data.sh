#!/bin/bash
# Incremental historical data collection
# Collects one symbol at a time to prevent memory overflow

API="https://marketai-backend-production-397e.up.railway.app/api/correlation"

echo "🚀 Starting incremental data collection..."
echo ""

# Crypto symbols
CRYPTOS=("BTC" "ETH" "SOL")

# Stock symbols  
STOCKS=("SPY" "QQQ" "COIN" "MSTR" "TSLA" "NVDA")

# Collect crypto data
echo "📊 Collecting crypto data..."
for symbol in "${CRYPTOS[@]}"; do
  echo "  → Fetching $symbol..."
  curl -s -X POST "$API/fetch-symbol" \
    -H "Content-Type: application/json" \
    -d "{\"symbol\":\"$symbol\",\"type\":\"crypto\",\"years\":3}" | jq -r '.message // .error'
  sleep 3
done

echo ""
echo "📈 Collecting stock data..."
for symbol in "${STOCKS[@]}"; do
  echo "  → Fetching $symbol..."
  curl -s -X POST "$API/fetch-symbol" \
    -H "Content-Type: application/json" \
    -d "{\"symbol\":\"$symbol\",\"type\":\"stock\",\"years\":3}" | jq -r '.message // .error'
  sleep 3
done

echo ""
echo "✅ Data collection complete!"
echo ""
echo "📊 Collection status:"
curl -s "$API/collection-status" | jq '.data'

echo ""
echo "🧠 Ready to run pattern detection:"
echo "curl -X POST $API/detect-patterns"
