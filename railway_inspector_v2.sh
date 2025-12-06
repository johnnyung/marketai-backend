#!/bin/bash

URL="https://marketai-backend-production-b474.up.railway.app"

echo "====================================================="
echo "     🚨 Railway Deep Inspector — v2 (Critical)"
echo "====================================================="

echo ""
echo "🔍 1. Checking deployment commit hash..."
curl -s $URL/debug/commit || echo "❌ commit endpoint missing"

echo ""
echo "🔍 2. Checking what file actually boots the server..."
curl -s $URL/debug/entrypoint || echo "❌ entrypoint endpoint missing"

echo ""
echo "🔍 3. Checking route mapping (Express introspection)..."
curl -s $URL/debug/routes || echo "❌ debug/routes not available"

echo ""
echo "🔍 4. Checking whether authRoutes.js exists on deployed server..."
curl -s $URL/debug/file/routes/authRoutes.js || echo "❌ Cannot fetch file"

echo ""
echo "🔍 5. Checking whether OLD auth.js exists on deployed server..."
curl -s $URL/debug/file/routes/auth.js || echo "❌ Cannot fetch file"

echo ""
echo "🔍 6. Checking deployed directory listing..."
curl -s $URL/debug/ls || echo "❌ directory debug endpoint missing"

echo ""
echo "====================================================="
echo "DONE — Paste output here so we diagnose the real cause"
echo "====================================================="
