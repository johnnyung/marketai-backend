#!/bin/bash
echo "=========================================="
echo "   FDV-S2: SP500 UNIVERSE VERIFICATION"
echo "=========================================="

node -r dotenv/config -e "
import('./dist/services/tickerUniverseService.js').then(u =>
  u.default.refreshUniverse().then(x => {
    console.log('Universe size:', x.length);
    console.log('Sample:', x.slice(0,15));
  })
);
"
