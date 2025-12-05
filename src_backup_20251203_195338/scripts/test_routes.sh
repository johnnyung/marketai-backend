#!/bin/bash
# Must be run AFTER 'npm start' is active in another terminal

# 1. Generate a valid token (requires JWT_SECRET in .env)
# We mock a token for local testing if generation fails,
# but ideally we use the node command to sign one.

echo "--- TESTING TOP 3 ROUTE ---"
# Note: User must replace TOKEN with their actual generated token from Phase 20 steps
# or login to get one.
# For now, we ping the health check which is public.

curl -s http://localhost:8080/ | grep "MarketAI" && echo "✅ Base Route OK" || echo "❌ Base Route Failed"

echo "To test Top 3, run:"
echo 'curl -H "Authorization: Bearer <YOUR_TOKEN>" http://localhost:8080/api/ai-tips/top3'
