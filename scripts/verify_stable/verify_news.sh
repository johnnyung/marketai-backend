#!/bin/bash
echo "=========================================="
echo "   FDV-S3: NEWS AGGREGATION VERIFICATION"
echo "=========================================="

node -r dotenv/config -e "
import('./dist/services/providers/newsProvider.js').then(n =>
  n.default.getYahooNews().then(r =>
    console.log('Yahoo:', r.length, 'Sample:', r.slice(0,1))
  )
);
"

node -r dotenv/config -e "
import('./dist/services/providers/newsProvider.js').then(n =>
  n.default.getMarketWatchNews().then(r =>
    console.log('MarketWatch:', r.length, 'Sample:', r.slice(0,1))
  )
);
"

node -r dotenv/config -e "
import('./dist/services/providers/newsProvider.js').then(n =>
  n.default.getRedditNews().then(r =>
    console.log('Reddit:', r.length, 'Sample:', r.slice(0,1))
  )
);
"
