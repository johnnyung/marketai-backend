#!/bin/bash
echo "=========================================="
echo "   FDV-S6: OMNI-VECTOR SNAPSHOT VERIFICATION"
echo "=========================================="

node -r dotenv/config -e "
import('./dist/services/omniVectorService.js').then(o =>
  o.default.buildSnapshotForTicker('AAPL').then(r =>
    console.log('AAPL Snapshot Keys:', Object.keys(r))
  )
);
"

node -r dotenv/config -e "
import('./dist/services/omniVectorService.js').then(o =>
  o.default.buildSnapshotsForUniverse(5).then(r =>
    console.log('Universe Snapshots:', r.length)
  )
);
"
