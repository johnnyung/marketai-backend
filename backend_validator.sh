#!/bin/bash

echo "======================================================"
echo "         MARKETAI — BACKEND DEPLOYMENT VALIDATOR"
echo "======================================================"

URL="${1:-https://marketai-backend-production-b474.up.railway.app}"

echo "🔗 Testing backend: $URL"
echo ""

FAIL=0

check() {
  local NAME="$1"
  local CMD="$2"
  local EXPECT_CODES="$3"

  echo "--------------------------------------"
  echo "🧪 TEST: $NAME"
  echo "--------------------------------------"

  STATUS=$(eval "$CMD")
  echo "Status: $STATUS"

  if echo "$EXPECT_CODES" | tr ' ' '\n' | grep -q "^$STATUS$"; then
    echo "✅ PASS: $NAME"
  else
    echo "❌ FAIL: $NAME (expected one of: $EXPECT_CODES)"
    FAIL=$((FAIL+1))
  fi

  echo ""
}

# 1) Health
check "Health endpoint" \
  "curl -s -o /dev/null -w \"%{http_code}\" $URL/api/health" \
  "200"

# 2) Register
EMAIL="validator_$RANDOM@test.com"
check "Register" \
  "curl -s -o /dev/null -w \"%{http_code}\" -X POST $URL/api/auth/register \
     -H 'Content-Type: application/json' \
     -d '{\"email\":\"$EMAIL\",\"password\":\"test123\"}'" \
  "200 201"

# 3) Login + token extraction
LOGIN_JSON=$(curl -s -X POST $URL/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{\"email\":\"'$EMAIL'\",\"password\":\"test123\"}')

TOKEN=$(echo "$LOGIN_JSON" | grep -o '\"token\":\"[^\"]*\"' | cut -d '"' -f 4)

if [ -z "$TOKEN" ]; then
  echo "❌ FAIL: Login (no token returned)"
  FAIL=$((FAIL+1))
else
  echo "✅ Token received for $EMAIL"
fi

echo ""

# 4) /api/auth/me
check "/api/auth/me" \
  "curl -s -o /dev/null -w \"%{http_code}\" \
     -H 'Authorization: Bearer '$TOKEN $URL/api/auth/me" \
  "200"

# 5) CORS Preflight to /api/brain/full-cycle
check "CORS Preflight /api/brain/full-cycle" \
  "curl -s -o /dev/null -w \"%{http_code}\" -X OPTIONS \
     $URL/api/brain/full-cycle \
     -H 'Origin: https://stocks.jeeniemedia.com' \
     -H 'Access-Control-Request-Method: POST' \
     -H 'Access-Control-Request-Headers: Content-Type, Authorization'" \
  "200 204"

# 6) Brain full-cycle (just status check)
check "Brain full-cycle" \
  "curl -s -o /dev/null -w \"%{http_code}\" -X POST \
     $URL/api/brain/full-cycle \
     -H 'Authorization: Bearer '$TOKEN \
     -H 'Content-Type: application/json' \
     -d '{\"ticker\":\"AAPL\"}'" \
  "200 202"

echo "======================================================"
if [ "$FAIL" -eq 0 ]; then
  echo "🎉 ALL TESTS PASSED — Deployment healthy!"
else
  echo "❌ $FAIL TEST(S) FAILED — Deployment not fully functional."
fi
echo "======================================================"
