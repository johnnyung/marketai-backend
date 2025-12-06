#!/bin/bash

echo "==============================================="
echo "   🔧 Generating Corrected Backend Validator"
echo "==============================================="

cat > backend_validator.sh << 'EOS'
#!/bin/bash

echo "======================================================"
echo "         MARKETAI — BACKEND DEPLOYMENT VALIDATOR"
echo "======================================================"

URL="${1:-https://marketai-backend-production-b474.up.railway.app}"

echo "🔗 Testing backend: $URL"
echo ""

FAIL=0

check_status() {
  NAME=$1
  CMD=$2
  shift 2
  EXPECTED=("$@")

  echo "--------------------------------------"
  echo "🧪 TEST: $NAME"
  echo "--------------------------------------"

  RESP=$($CMD 2>/dev/null)
  STATUS=$(echo "$RESP" | head -n 1 | awk '{print $2}')

  echo "Status: $STATUS"

  for E in "${EXPECTED[@]}"; do
    if [[ "$STATUS" == "$E" ]]; then
      echo "✅ PASS: $NAME"
      echo ""
      return 0
    fi
  done

  echo "❌ FAIL: $NAME (expected: ${EXPECTED[*]})"
  echo ""
  FAIL=$((FAIL+1))
}

# HEALTH
check_status "Health endpoint" \
  "curl -I $URL/api/health --silent" \
  200

# REGISTER
EMAIL="validator_$RANDOM@test.com"

check_status "Register" \
  "curl -I -X POST $URL/api/auth/register \
     -H 'Content-Type: application/json' \
     -d '{\"email\":\"$EMAIL\",\"password\":\"test123\"}' \
     --silent" \
  200 201

# LOGIN
LOGIN=$(curl -s -X POST $URL/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{\"email\":\"$EMAIL\",\"password\":\"test123\"}' )

TOKEN=$(echo "$LOGIN" | grep -o '"token":"[^"]*"' | cut -d '"' -f 4)

if [[ -z "$TOKEN" ]]; then
  echo "❌ FAIL: Login (no token received)"
  FAIL=$((FAIL+1))
else
  echo "✅ PASS: Login (token received)"
fi
echo ""

# AUTH /ME
check_status "/api/auth/me" \
  "curl -I -H 'Authorization: Bearer $TOKEN' $URL/api/auth/me --silent" \
  200

# CORS
check_status "CORS Preflight /api/brain/full-cycle" \
  "curl -I -X OPTIONS $URL/api/brain/full-cycle \
     -H 'Origin: https://stocks.jeeniemedia.com' \
     -H 'Access-Control-Request-Method: POST' \
     --silent" \
  204

# BRAIN
check_status "Brain full-cycle" \
  "curl -I -X POST $URL/api/brain/full-cycle \
     -H 'Authorization: Bearer $TOKEN' \
     -H 'Content-Type: application/json' \
     -d '{}' \
     --silent" \
  200 202

echo "======================================================"
if [[ $FAIL -eq 0 ]]; then
  echo "🎉 ALL TESTS PASSED — Backend is fully functional!"
else
  echo "❌ $FAIL TEST(S) FAILED — Review needed."
fi
echo "======================================================"
EOS

chmod +x backend_validator.sh
echo "🎉 Validator updated successfully!"
