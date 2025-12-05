#!/bin/bash
set -e

# Setup environment
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${ROOT_DIR}"

echo "=========================================="
echo "🛡️  FDV-1: BACKEND DATA VERIFICATION SUITE"
echo "=========================================="

# 1. Build
echo ">>> Building TypeScript..."
if ! npm run build; then
    echo "❌ Build Failed. Aborting."
    exit 1
fi
echo "✅ Build Complete."
echo ""

# Report Status Variables
FMP_STATUS="PENDING"
NEWS_STATUS="PENDING"
GOV_STATUS="PENDING"
CRYPTO_STATUS="PENDING"
INGEST_STATUS="PENDING"

# 2. Run Checks
echo ">>> 1. Checking FMP Core..."
if node -r dotenv/config dist/scripts/verify_sources/verify_fmp_core.js; then
    FMP_STATUS="PASS"
else
    FMP_STATUS="FAIL"
fi
echo ""

echo ">>> 2. Checking News Sources..."
if node -r dotenv/config dist/scripts/verify_sources/verify_news_sources.js; then
    NEWS_STATUS="PASS"
else
    NEWS_STATUS="FAIL"
fi
echo ""

echo ">>> 3. Checking Government Sources..."
if node -r dotenv/config dist/scripts/verify_sources/verify_gov_sources_v2.js; then
    GOV_STATUS="PASS"
else
    GOV_STATUS="FAIL"
fi
echo ""

echo ">>> 4. Checking Crypto Sources..."
if node -r dotenv/config dist/scripts/verify_sources/verify_crypto_sources.js; then
    CRYPTO_STATUS="PASS"
else
    CRYPTO_STATUS="FAIL" # Crypto is optional but script exit code implies functionality
fi
echo ""

echo ">>> 6. Checking Price Fallback Chain (FDV-3)..."
bash scripts/verify_prices_v3.sh
echo ""

echo ">>> 5. Checking Ingestion Pipelines..."
if node -r dotenv/config dist/scripts/verify_sources/verify_ingestion_pipelines.js; then
    INGEST_STATUS="PASS"
else
    INGEST_STATUS="FAIL"
fi
echo ""

# 3. Final Report
echo "========================================"
echo "      DATA HEALTH REPORT (FDV-1)        "
echo "========================================"
echo "FMP CORE:       $FMP_STATUS"
echo "NEWS FEEDS:     $NEWS_STATUS"
echo "GOV DATA:       $GOV_STATUS"
echo "CRYPTO:         $CRYPTO_STATUS"
echo "PIPELINES:      $INGEST_STATUS"
echo "========================================"

# Exit Code Logic
if [ "$FMP_STATUS" == "FAIL" ] || [ "$INGEST_STATUS" == "FAIL" ]; then
    echo "❌ CRITICAL FAILURE in Core Data Services."
    exit 1
fi

if [ "$NEWS_STATUS" == "FAIL" ] || [ "$GOV_STATUS" == "FAIL" ]; then
    echo "⚠️  WARNING: Secondary Data Sources Degraded."
    # We verify functionality but allow soft fails for external scraping flakiness
    exit 0
fi

echo "✅ SYSTEM READY."
exit 0
