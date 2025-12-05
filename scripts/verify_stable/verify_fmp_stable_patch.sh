#!/bin/bash
echo ">>> FMP Stable Patch Verification"
node -r dotenv/config -e "
import('./dist/services/fmpService.js').then(async s => {
  try {
    console.log('Checking getSP500Stable...');
    if (typeof s.default.getSP500Stable !== 'function') {
        console.error('❌ FAILED: getSP500Stable method missing on fmpService default export');
        process.exit(1);
    }
    const sp = await s.default.getSP500Stable();
    console.log('SP500 Stable Count:', Array.isArray(sp) ? sp.length : 'ERR');
    
    const nas = await s.default.getNasdaqConstituents();
    console.log('NASDAQ Count:', Array.isArray(nas) ? nas.length : 'ERR');
    
    const dow = await s.default.getDowJonesConstituents();
    console.log('DOW Count:', Array.isArray(dow) ? dow.length : 'ERR');
  } catch (e) { console.error('Verify Error:', e.message); }
});
"
