#!/bin/bash
echo "=========================================="
echo "   FDV-S5: SENTIMENT ENGINE VERIFICATION"
echo "=========================================="

# Uses default fallback universe for quick check
node -r dotenv/config -e "
import('./dist/services/sentimentService.js').then(s =>
  s.default.buildTickerSentimentSnapshot(['AAPL', 'NVDA']).then(r => {
    console.log('Snapshot Count:', r.length);
    const active = r.filter(x => x.mentions > 0);
    console.log('Active Tickers:', active.length);
    if (active.length > 0) console.log('Sample:', active[0]);
  })
);
"

node -r dotenv/config -e "
import('./dist/services/sentimentService.js').then(s =>
  s.default.getTopSentimentMovers(5).then(r =>
    console.log('Top Movers:', r.length > 0 ? r.slice(0,3) : 'None')
  )
);
"
