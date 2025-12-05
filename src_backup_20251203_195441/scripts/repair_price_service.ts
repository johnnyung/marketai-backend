import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import fmpService from '../services/fmpService.js';
import priceService from '../services/priceService.js';

const TICKERS = ['AAPL', 'MSFT', 'NVDA'];

async function runPriceDiagnostics() {
    console.log('\n🩺 STARTING PRICE SERVICE DIAGNOSTICS (Phase 11)');
    console.log('================================================');

    const apiKey = process.env.FMP_API_KEY;
    console.log(`🔑 API Key Configured: ${apiKey ? 'YES (' + apiKey.substring(0,4) + '...)' : 'NO'}`);

    for (const ticker of TICKERS) {
        console.log(`\n🔎 DIAGNOSING: ${ticker}`);
        console.log('------------------------------------------------');

        // 1. RAW AXIOS CHECK (Quote Short)
// LEGACY_PRESERVED: const rawUrl = `https://financialmodelingprep.comSTABLE_ENDPOINT /* LEGACY_PRESERVED: /stable *//quote-short/${ticker}?apikey=${apiKey}`;
// LEGACY_PRESERVED: const rawUrl = `https://financialmodelingprep.comSTABLE_ENDPOINT /* LEGACY_PRESERVED: /stable *//quote-short/${ticker}?apikey=${apiKey}`;
// LEGACY_PRESERVED: const rawUrl = `https://financialmodelingprep.comSTABLE_ENDPOINT /* LEGACY_PRESERVED: /stable *//quote-short/${ticker}?apikey=${apiKey}`;
        const rawUrl = `https://financialmodelingprep.com/apifinancialmodelingprep.com/stablequote-short/${ticker}?apikey=${apiKey}`;
        console.log(`   👉 Requesting Raw URL: ${rawUrl.replace(apiKey || '', 'HIDDEN')}`);
        
        try {
            const start = Date.now();
            const res = await axios.get(rawUrl, { timeout: 10000 });
            const duration = Date.now() - start;
            
            console.log(`   ✅ HTTP Status: ${res.status} (${duration}ms)`);
            console.log(`   📦 Body Type:   ${typeof res.data} (IsArray: ${Array.isArray(res.data)})`);
            
            if (Array.isArray(res.data) && res.data.length > 0) {
                console.log(`   📄 Raw Data:    ${JSON.stringify(res.data[0])}`);
                if (typeof res.data[0].price === 'number') {
                    console.log(`   ✅ Validation:  Price found (${res.data[0].price})`);
                } else {
                    console.error(`   ❌ Validation:  'price' field missing or invalid type.`);
                }
            } else {
                console.error(`   ❌ Validation:  Empty array returned.`);
            }

        } catch (e: any) {
            console.error(`   ❌ HTTP Request Failed:`);
            if (e.response) {
                console.error(`      Status: ${e.response.status}`);
                console.error(`      Data:   ${JSON.stringify(e.response.data)}`);
            } else {
                console.error(`      Error:  ${e.message}`);
            }
        }

        // 2. SERVICE LAYER CHECK
        console.log(`   👉 Testing fmpService.getPrice('${ticker}')...`);
        try {
            const servicePrice = await fmpService.getPrice(ticker);
            console.log(`   ✅ fmpService Result:`, JSON.stringify(servicePrice));
        } catch (e: any) {
            console.error(`   ❌ fmpService Threw:`, e.message);
        }

        // 3. WRAPPER LAYER CHECK
        console.log(`   👉 Testing priceService.getCurrentPrice('${ticker}')...`);
        try {
            const wrapperPrice = await priceService.getCurrentPrice(ticker);
            console.log(`   ✅ priceService Result:`, JSON.stringify(wrapperPrice));
        } catch (e: any) {
            console.error(`   ❌ priceService Threw:`, e.message);
        }
    }

    console.log('\n🏁 DIAGNOSTICS COMPLETE');
}

runPriceDiagnostics();
