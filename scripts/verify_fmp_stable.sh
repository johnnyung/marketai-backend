#!/bin/bash
echo ">>> TESTING FMP STABLE ENDPOINTS"

echo "--- SP500 Constituents ---"
node -r dotenv/config -e "
import('./dist/services/fmpService.js').then(s =>
  s.default.getSP500Constituents().then(d => {
    console.log('Count:', d.length);
    console.log('Sample:', d.slice(0,10));
  })
);
"

echo "--- Price (AAPL) ---"
node -r dotenv/config -e "
import('./dist/services/fmpService.js').then(s =>
  s.default.getPrice('AAPL').then(d => console.log('Price:', d, 'Debug:', s.default.lastDebug))
);
"

echo "--- Daily History (AAPL) ---"
node -r dotenv/config -e "
import('./dist/services/historyService.js').then(h =>
  h.default.getDaily('AAPL').then(d => console.log('Daily Candles:', d.length))
);
"
