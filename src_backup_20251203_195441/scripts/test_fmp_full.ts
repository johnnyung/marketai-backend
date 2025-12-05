import axios from 'axios';
import path from 'path';
import dotenv from 'dotenv';

// 1. CONFIGURATION
// ---------------------------------------------------------
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
// Attempt .env.local if .env didn't provide the key
if (!process.env.FMP_API_KEY) {
    dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
}

const API_KEY = process.env.FMP_API_KEY;
const BASE_URL = 'https://financialmodelingprep.com/stable';
const SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'JPM', 'NFLX', 'AMD'];

// 2. TEST DEFINITIONS
// ---------------------------------------------------------
interface TestDef {
    name: string;
    path: string; // uses {symbol} placeholder
    global?: boolean; // if true, runs once, ignoring symbols list
}

const TESTS: TestDef[] = [
    // Ticker Specific
    { name: 'Quote', path: '/quote?symbol={symbol}' },
    { name: 'Profile', path: '/profile?symbol={symbol}' },
    { name: 'Historical Daily', path: '/historical-price-full/{symbol}' },
    { name: 'Intraday (5min)', path: '/historical-chart/5min/{symbol}' },
    { name: 'Key Metrics (TTM)', path: '/key-metrics-ttm?symbol={symbol}' },
    { name: 'Ratios (TTM)', path: '/ratios-ttm?symbol={symbol}' },
    { name: 'Price Targets', path: '/price-target-consensus?symbol={symbol}' },
    { name: 'Institutional', path: '/institutional-ownership?symbol={symbol}' },
    
    // Global / Macro
    { name: 'Economic (GDP)', path: '/economic?name=GDP', global: true },
    { name: 'Economic (10Y)', path: '/economic?name=10Y', global: true },
    { name: 'SP500 List', path: '/sp500-constituent', global: true }
];

// 3. EXECUTION ENGINE
// ---------------------------------------------------------
async function runHarness() {
    console.log('\n📡 FMP STABLE API TEST HARNESS');
    console.log('=============================================');
    
    if (!API_KEY) {
        console.error('❌ CRITICAL: FMP_API_KEY is missing from environment.');
        process.exit(1);
    }

    console.log(`🔑 Key Prefix: ${API_KEY.substring(0, 4)}...`);
    console.log(`🌐 Base URL:   ${BASE_URL}`);
    console.log('---------------------------------------------');

    let passed = 0;
    let failed = 0;

    // Helper to run a single request
    const runTest = async (testName: string, urlPath: string) => {
        // Handle Path Params vs Query Params
        // Logic: If path contains ?, append &apikey. If not, append ?apikey.
        const separator = urlPath.includes('?') ? '&' : '?';
        const fullUrl = `${BASE_URL}${urlPath}${separator}apikey=${API_KEY}`;
        const maskedUrl = fullUrl.replace(API_KEY, 'HIDDEN');

        try {
            const res = await axios.get(fullUrl, { timeout: 8000 });
            
            // Validation Logic
            let isValid = false;
            let details = '';

            if (res.status === 200) {
                if (Array.isArray(res.data)) {
                    if (res.data.length > 0) {
                        isValid = true;
                        details = `Array[${res.data.length}]`;
                    } else {
                        details = 'Empty Array []';
                    }
                } else if (typeof res.data === 'object') {
                    // Some endpoints return objects like { symbol: ... }
                    if (res.data && Object.keys(res.data).length > 0) {
                        isValid = true;
                        details = 'Object {}';
                    } else {
                        details = 'Empty Object';
                    }
                } else {
                    details = `Unknown Format: ${typeof res.data}`;
                }
            } else {
                details = `Status: ${res.status}`;
            }

            if (isValid) {
                console.log(`✅ PASS: ${testName.padEnd(25)} -> ${details}`);
                passed++;
            } else {
                console.log(`❌ FAIL: ${testName.padEnd(25)} -> ${details}`);
                console.log(`   URL: ${maskedUrl}`);
                failed++;
            }

        } catch (e: any) {
            const status = e.response?.status || 'NET';
            const msg = e.response?.data?.['Error Message'] || e.message;
            console.log(`❌ FAIL: ${testName.padEnd(25)} -> Error ${status}: ${msg}`);
            // console.log(`   URL: ${maskedUrl}`);
            failed++;
        }
        
        // Rate Limit Pause
        await new Promise(r => setTimeout(r, 100));
    };

    // Iterate Tests
    for (const test of TESTS) {
        if (test.global) {
            await runTest(test.name, test.path);
        } else {
            // For ticker-specific tests, we test 1 symbol fully to check endpoint validity,
            // then verify others sparingly or just the first one to save quota/time.
            // Testing ALL symbols for ALL endpoints might hit rate limits.
            // Let's test the first symbol (AAPL) for all, and maybe one random other.
            
            const target = SYMBOLS[0]; // AAPL
            const resolvedPath = test.path.replace('{symbol}', target);
            await runTest(`${test.name} (${target})`, resolvedPath);
        }
    }

    // 4. SUMMARY
    // ---------------------------------------------------------
    console.log('\n=============================================');
    console.log('TEST SUMMARY');
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log('=============================================');

    if (failed > 0) {
        console.log('⚠️  Some endpoints failed. Check the logs above for 404s or empty arrays.');
        process.exit(1);
    } else {
        console.log('🎉 ALL CHECKS PASSED. FMP Connection is Healthy.');
        process.exit(0);
    }
}

runHarness();
