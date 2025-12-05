#!/bin/bash
echo "=========================================="
echo "   FDV-S4: GOVERNMENT DATA VERIFICATION"
echo "=========================================="

node -r dotenv/config -e "
import('./dist/services/providers/govProvider.js').then(g =>
  g.default.getWhiteHouseFeed().then(r =>
    console.log('White House:', r.length)
  )
);
"

node -r dotenv/config -e "
import('./dist/services/providers/govProvider.js').then(g =>
  g.default.getHouseTradingData().then(r =>
    console.log('House Trades:', Array.isArray(r) ? r.length : r)
  )
);
"
