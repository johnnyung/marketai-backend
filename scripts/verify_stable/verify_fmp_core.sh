#!/bin/bash
echo "=========================================="
echo "   FDV-S1: FMP STABLE CORE VERIFICATION"
echo "=========================================="

echo "--- Price (AAPL) ---"
node -r dotenv/config -e "
import('./dist/services/fmpService.js').then(s =>
  s.default.getPrice('AAPL').then(r =>
    console.log('Price:', r, 'Debug:', s.default.lastDebug)
  )
);
"

echo "--- Profile (AAPL) ---"
node -r dotenv/config -e "
import('./dist/services/fmpService.js').then(s =>
  s.default.getCompanyProfile('AAPL').then(r =>
    console.log('Profile:', r ? r.companyName : 'NULL')
  )
);
"

echo "--- Intraday (5min) ---"
node -r dotenv/config -e "
import('./dist/services/fmpService.js').then(s =>
  s.default.getIntraday('AAPL').then(r =>
    console.log('Intraday candles:', r.length)
  )
);
"

echo "--- Daily Historical ---"
node -r dotenv/config -e "
import('./dist/services/fmpService.js').then(s =>
  s.default.getDailyCandles('AAPL').then(r =>
    console.log('Daily candles (30d):', r.length)
  )
);
"
