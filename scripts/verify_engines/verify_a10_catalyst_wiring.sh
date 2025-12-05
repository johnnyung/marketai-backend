#!/bin/bash

echo "============================================================"
echo "   MARKET_AI — VERIFY A10 CATALYST WIRING AUDIT"
echo "============================================================"

DOC="docs/A10_CATALYST_WIRING_AUDIT.md"

if [ ! -f "$DOC" ]; then
  echo "❌ A10 report not found at $DOC"
  echo "   Run: a10_catalyst_wiring_audit.sh"
  exit 1
fi

echo "✅ Found A10 report: $DOC"
echo
echo "----- Last 20 lines (preview) -----"
tail -n 20 "$DOC" || true
echo "-----------------------------------"
echo "✅ A10 wiring audit file exists and is readable."
