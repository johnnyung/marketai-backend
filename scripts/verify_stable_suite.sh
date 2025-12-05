#!/bin/bash

echo "======================================================"
echo "      MARKET_AI — FULL STABLE MODE VERIFICATION        "
echo "======================================================"

echo ""
echo ">>> Building Project..."
npm run build

echo ""
echo ">>> FDV-S1: FMP CORE"
bash scripts/verify_stable/verify_fmp_core.sh

echo ""
echo ">>> FDV-S2: SP500 UNIVERSE"
bash scripts/verify_stable/verify_universe.sh

echo ""
echo ">>> FDV-S3: NEWS"
bash scripts/verify_stable/verify_news.sh

echo ""
echo ">>> FDV-S4: GOVERNMENT DATA"
bash scripts/verify_stable/verify_gov.sh

echo ""
echo ">>> FDV-S5: SENTIMENT ENGINE"
bash scripts/verify_stable/verify_sentiment.sh

echo ""
echo ">>> FDV-S6: OMNI-VECTOR"
bash scripts/verify_stable/verify_omnivector.sh

echo ""
echo "======================================================"
echo "   ✅ ALL STABLE SERVICES VERIFIED — SYSTEM OPERATIONAL"
echo "======================================================"
