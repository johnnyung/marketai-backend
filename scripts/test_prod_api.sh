#!/bin/bash
# Usage: ./scripts/test_prod_api.sh <TOKEN>

URL="https://marketai-backend-production-397e.up.railway.app/api/ai-tips/top3"
TOKEN="$1"

if [ -z "$TOKEN" ]; then
    echo "❌ Error: Token required."
    echo "Usage: ./scripts/test_prod_api.sh \"Bearer ...\""
    exit 1
fi

echo "📡 Pinging Production: $URL"
echo "🔑 Using Token: ${TOKEN:0:15}..."

RESPONSE=$(curl -s -H "Authorization: $TOKEN" "$URL")

# Validations
if echo "$RESPONSE" | grep -q "fallback high-liquid list"; then
    echo "❌ FAIL: Backend is using fallback list (FMP Failure)"
    exit 1
fi

if echo "$RESPONSE" | grep -q "error"; then
    echo "❌ FAIL: API returned error: $RESPONSE"
    exit 1
fi

COUNT=$(echo "$RESPONSE" | grep -o "ticker" | wc -l)

if [ "$COUNT" -ge 3 ]; then
    echo "✅ SUCCESS: Received $COUNT intelligence bundles."
    echo "   System is LIVE and generating Real Data."
else
    echo "⚠️  WARNING: Received $COUNT bundles (Expected 3+)."
    echo "   Response: $RESPONSE"
fi
