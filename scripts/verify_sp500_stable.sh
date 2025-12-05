#!/bin/bash
echo ">>> Testing SP500 Stable Endpoint..."
node -r dotenv/config -e "
  import('./dist/services/fmpService.js')
    .then(s => s.default.getSP500Constituents()
    .then(x => {
        console.log('FMP Stable SP500 Count:', Array.isArray(x) ? x.length : x);
        if (Array.isArray(x) && x.length > 0) {
             console.log('Sample:', x.slice(0,5));
        } else {
             console.log('Response is empty or invalid.');
        }
    })
    .catch(e => console.error('Error:', e))
    );
"
