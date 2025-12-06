#!/bin/bash

echo "==============================================="
echo "      MARKETAI — RAILWAY DEPLOYMENT INSPECTOR"
echo "==============================================="

APP_URL="https://marketai-backend-production-b474.up.railway.app"

echo "🔍 Checking what file is actually running..."

curl -s $APP_URL/debug/env | sed 's/^/  /'

echo ""
echo "🔍 Checking server fingerprint (should be Express):"

curl -I $APP_URL | grep -Ei "x-powered-by|server" | sed 's/^/  /'

echo ""
echo "🔍 Checking route list (should NOT be empty):"

curl -s $APP_URL/api/health | sed 's/^/  /'

echo ""
echo "🔍 Checking if /api exists at all:"
curl -I $APP_URL/api --silent | head -n 1 | sed 's/^/  /'

echo ""
echo "🔍 Checking what files were deployed (Railway build logs):"
curl -s $APP_URL/debug/files 2>/dev/null | sed 's/^/  /'

echo ""
echo "==============================================="
echo "INSPECTION COMPLETE — send me this output"
echo "==============================================="
