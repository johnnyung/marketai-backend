#!/bin/bash
echo "Testing /active Endpoint..."
curl -X GET http://localhost:8080/api/ai-tips/active -H "Authorization: Bearer YOUR_TOKEN_HERE"
echo ""
