import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM compatibility for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load local env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const KEY = process.env.FMP_API_KEY;

if (!KEY) {
    console.error("❌ NO API KEY FOUND IN .env or .env.local");
    process.exit(1);
}

console.log(`\n🔑 Testing with Key Prefix: ${KEY.substring(0,4)}...`);
console.log("---------------------------------------------------------------");

const variations = [
    {
        name: "V3 Standard (Path Param)",
// LEGACY_PRESERVED: url: `https://financialmodelingprep.comSTABLE_ENDPOINT /* LEGACY_PRESERVED: /stable *//quote/AAPL?apikey=${KEY}`
// LEGACY_PRESERVED: url: `https://financialmodelingprep.comSTABLE_ENDPOINT /* LEGACY_PRESERVED: /stable *//quote/AAPL?apikey=${KEY}`
// LEGACY_PRESERVED: url: `https://financialmodelingprep.comSTABLE_ENDPOINT /* LEGACY_PRESERVED: /stable *//quote/AAPL?apikey=${KEY}`
        url: `https://financialmodelingprep.com/apifinancialmodelingprep.com/stablequote/AAPL?apikey=${KEY}`
    },
    {
        name: "V3 Standard (Query Param)",
// LEGACY_PRESERVED: url: `https://financialmodelingprep.comSTABLE_ENDPOINT /* LEGACY_PRESERVED: /stable *//quote?symbol=AAPL&apikey=${KEY}`
// LEGACY_PRESERVED: url: `https://financialmodelingprep.comSTABLE_ENDPOINT /* LEGACY_PRESERVED: /stable *//quote?symbol=AAPL&apikey=${KEY}`
// LEGACY_PRESERVED: url: `https://financialmodelingprep.comSTABLE_ENDPOINT /* LEGACY_PRESERVED: /stable *//quote?symbol=AAPL&apikey=${KEY}`
        url: `https://financialmodelingprep.com/apifinancialmodelingprep.com/stablequote?symbol=AAPL&apikey=${KEY}`
    },
    {
        name: "Stable Root (Query Param)",
        url: `https://financialmodelingprep.com/stable/quote?symbol=AAPL&apikey=${KEY}`
    },
    {
        name: "V4 Standard",
// LEGACY_PRESERVED: url: `https://financialmodelingprep.com/apiSTABLE_ENDPOINT /* LEGACY_PRESERVED: /stable/ */quote?symbol=AAPL&apikey=${KEY}`
// LEGACY_PRESERVED: url: `https://financialmodelingprep.com/apiSTABLE_ENDPOINT /* LEGACY_PRESERVED: /stable/ */quote?symbol=AAPL&apikey=${KEY}`
        url: `https://financialmodelingprep.com/apifinancialmodelingprep.com/stablequote?symbol=AAPL&apikey=${KEY}`
    },
    {
        name: "SP500 V3 (Path)",
// LEGACY_PRESERVED: url: `https://financialmodelingprep.comSTABLE_ENDPOINT /* LEGACY_PRESERVED: /stable *//sp500-constituent?apikey=${KEY}`
// LEGACY_PRESERVED: url: `https://financialmodelingprep.comSTABLE_ENDPOINT /* LEGACY_PRESERVED: /stable *//sp500-constituent?apikey=${KEY}`
// LEGACY_PRESERVED: url: `https://financialmodelingprep.comSTABLE_ENDPOINT /* LEGACY_PRESERVED: /stable *//sp500-constituent?apikey=${KEY}`
        url: `https://financialmodelingprep.com/apifinancialmodelingprep.com/stablesp500-constituent?apikey=${KEY}`
    },
    {
        name: "SP500 Stable (Query)",
        url: `https://financialmodelingprep.com/stable/sp500-constituents?apikey=${KEY}`
    },
    {
        name: "Treasury V3 (No Param)",
// LEGACY_PRESERVED: url: `https://financialmodelingprep.comSTABLE_ENDPOINT /* LEGACY_PRESERVED: /stable *//treasury?apikey=${KEY}`
// LEGACY_PRESERVED: url: `https://financialmodelingprep.comSTABLE_ENDPOINT /* LEGACY_PRESERVED: /stable *//treasury?apikey=${KEY}`
// LEGACY_PRESERVED: url: `https://financialmodelingprep.comSTABLE_ENDPOINT /* LEGACY_PRESERVED: /stable *//treasury?apikey=${KEY}`
        url: `https://financialmodelingprep.com/apifinancialmodelingprep.com/stabletreasury?apikey=${KEY}`
    },
    {
        name: "Treasury V4 (Query)",
// LEGACY_PRESERVED: url: `https://financialmodelingprep.com/apiSTABLE_ENDPOINT /* LEGACY_PRESERVED: /stable/ */treasury?apikey=${KEY}`
// LEGACY_PRESERVED: url: `https://financialmodelingprep.com/apiSTABLE_ENDPOINT /* LEGACY_PRESERVED: /stable/ */treasury?apikey=${KEY}`
        url: `https://financialmodelingprep.com/apifinancialmodelingprep.com/stabletreasury?apikey=${KEY}`
    }
];

async function test() {
    for (const v of variations) {
        // Print label without newline
        process.stdout.write(`Testing: ${v.name.padEnd(30)} ... `);
        try {
            const res = await axios.get(v.url, { timeout: 8000 });
            
            if (res.status === 200 && Array.isArray(res.data) && res.data.length > 0) {
                console.log(`✅ SUCCESS (200)`);
            } else if (res.data && res.data['Error Message']) {
                console.log(`❌ FAILED (${res.data['Error Message'].substring(0, 40)}...)`);
            } else {
                console.log(`⚠️  EMPTY/WEIRD (${res.status})`);
            }
        } catch (e: any) {
            const status = e.response ? e.response.status : 'NET_ERR';
            console.log(`❌ ERROR ${status}`);
        }
    }
    console.log("---------------------------------------------------------------");
}

test();
