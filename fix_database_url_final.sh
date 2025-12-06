#!/bin/bash
set -e

echo "======================================"
echo "  FIXING DATABASE_URL (FINAL STEP)"
echo "======================================"

RAW=$(grep "^DATABASE_URL=" .env | sed 's/DATABASE_URL=//')

# Strip any ?ssl=... or other parameters
CLEANED=$(echo "$RAW" | sed 's/[?].*$//')

echo "🔧 Old URL:"
echo "$RAW"
echo ""
echo "🔧 Cleaned URL:"
echo "$CLEANED"

# Update .env
sed -i '' "s|^DATABASE_URL=.*$|DATABASE_URL=$CLEANED|" .env

echo "✅ .env updated"
echo "--------------------------------------"
echo "Run: npm run dev"
echo "--------------------------------------"
