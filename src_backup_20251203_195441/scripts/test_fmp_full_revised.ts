import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const API_KEY = process.env.FMP_API_KEY;
const BASE_URL = 'https://financialmodelingprep.com/stable';
const SYMBOL = 'AAPL';

async function runTests() {
    console.log('\n📡 FMP STABLE API VALIDATION (PHASE 37)');
    console.log('=========================================');
    
    const tests = [
        { name: 'Quote', path: `/quote?symbol=${SYMBOL}` },
        { name: 'Profile', path: `/profile?symbol=${SYMBOL}` },
        { name: 'Ratios TTM', path: `/ratios-ttm?symbol=${SYMBOL}` },
        { name: 'Key Metrics', path: `/key-metrics-ttm?symbol=${SYMBOL}` },
        { name: 'Stock News', path: `/stock-news?symbol=${SYMBOL}&limit=5` },
        { name: 'Market News', path: `/market-news?limit=5` },
        { name: 'Economic (GDP)', path: `/economic?name=GDP` },
        { name: 'Index (SP500)', path: `/sp500-constituents` },
        { name: 'Institutional', path: `/institutional-ownership?symbol=${SYMBOL}` },
        { name: 'Historical', path: `/historical-price-full?symbol=${SYMBOL}` }
    ];

    let passed = 0;
    let failed = 0;

    for (const t of tests) {
        const url = `${BASE_URL}${t.path}&apikey=${API_KEY}`;
        process.stdout.write(`   Checking ${t.name.padEnd(20)} ... `);
        
        try {
            const res = await axios.get(url, { timeout: 8000 });
            if (res.status === 200 && Array.isArray(res.data) && res.data.length > 0) {
                console.log(`✅ PASS`);
                passed++;
            } else {
                console.log(`❌ FAIL (Empty/Error)`);
                failed++;
            }
        } catch (e: any) {
             const code = e.response ? e.response.status : 'NET';
             console.log(`❌ FAIL (${code})`);
             failed++;
        }
        await new Promise(r => setTimeout(r, 200));
    }

    console.log('=========================================');
    console.log(`PASSED: ${passed} | FAILED: ${failed}`);
}

runTests();
