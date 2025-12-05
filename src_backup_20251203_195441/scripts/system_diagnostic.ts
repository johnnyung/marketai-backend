import axios from 'axios';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import { parseStringPromise } from 'xml2js';

dotenv.config();

// --- CONFIG ---
const TIMEOUT = 8000;
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

// --- HELPERS ---
const log = (section: string, status: string, msg: string, details?: any) => {
    const icon = status === 'OK' ? '✅' : status === 'WARN' ? '⚠️ ' : '❌';
    console.log(`${icon} [${section.padEnd(15)}] ${msg}`);
    if (details && status !== 'OK') console.log(`      -> DETAILS: ${details}`);
};

async function checkEnv() {
    console.log('\n1. ENVIRONMENT VARIABLES');
    console.log('------------------------');
    
    const keys = [
        'DATABASE_URL', 'FMP_API_KEY', 'TIINGO_API_KEY',
        'ANTHROPIC_API_KEY', 'REDDIT_CLIENT_ID'
    ];

    keys.forEach(k => {
        if (process.env[k]) {
            const val = process.env[k] as string;
            const masked = val.substring(0, 4) + '...';
            log('ENV', 'OK', `${k} is set (${masked})`);
        } else {
            log('ENV', 'FAIL', `${k} is MISSING`);
        }
    });
}

async function checkDB() {
    console.log('\n2. DATABASE CONNECTIVITY');
    console.log('------------------------');
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000
    });

    try {
        const start = Date.now();
        const res = await pool.query('SELECT NOW()');
        const latency = Date.now() - start;
        log('POSTGRES', 'OK', `Connected in ${latency}ms`);
        
        const counts = await pool.query(`
            SELECT
                (SELECT COUNT(*) FROM raw_data_collection) as raw,
                (SELECT COUNT(*) FROM digest_entries) as digest,
                (SELECT COUNT(*) FROM ai_stock_tips) as tips
        `);
        log('POSTGRES', 'OK', `Data Stats: Raw=${counts.rows[0].raw}, Digest=${counts.rows[0].digest}, Tips=${counts.rows[0].tips}`);
        
    } catch (e: any) {
        log('POSTGRES', 'FAIL', 'Connection Failed', e.message);
    } finally {
        await pool.end();
    }
}

async function checkFMP() {
    console.log('\n3. FMP API (Financial Modeling Prep)');
    console.log('------------------------------------');
    const key = process.env.FMP_API_KEY;
    if (!key) return log('FMP', 'FAIL', 'Skipping (No Key)');

    // TEST A: STABLE (Stocks)
    try {
        const url = `https://financialmodelingprep.com/stable/quote?symbol=AAPL&apikey=${key}`;
        const res = await axios.get(url, { timeout: TIMEOUT });
        if (Array.isArray(res.data) && res.data.length > 0) {
            log('FMP STABLE', 'OK', `AAPL Price: $${res.data[0].price}`);
        } else {
            log('FMP STABLE', 'WARN', 'Returned Empty Array', res.data);
        }
    } catch (e: any) {
        log('FMP STABLE', 'FAIL', `HTTP ${e.response?.status || 'Error'}`, e.message);
        if (e.response?.data) console.log("      -> API Response:", JSON.stringify(e.response.data));
    }

    // TEST B: STABLE (Indices - Often Blocked on Free/Starter)
    try {
        const url = `https://financialmodelingprep.com/stable/quote?symbol=^VIX&apikey=${key}`;
        await axios.get(url, { timeout: TIMEOUT });
        log('FMP INDICES', 'OK', '^VIX access permitted');
    } catch (e: any) {
        if (e.response?.status === 402 || e.response?.status === 403) {
            log('FMP INDICES', 'WARN', 'Indices Blocked (Expected on Starter Plan)');
        } else {
            log('FMP INDICES', 'FAIL', `HTTP ${e.response?.status || 'Error'}`, e.message);
        }
    }
}

async function checkTiingo() {
    console.log('\n4. TIINGO API (Backup Layer)');
    console.log('----------------------------');
    const key = process.env.TIINGO_API_KEY;
    if (!key) return log('TIINGO', 'FAIL', 'Skipping (No Key)');

    try {
        const url = `https://api.tiingo.com/iex/AAPL?token=${key}`;
        const res = await axios.get(url, { timeout: TIMEOUT });
        if (res.data && res.data.length > 0) {
            log('TIINGO', 'OK', `AAPL Price: $${res.data[0].tngoLast || res.data[0].last}`);
        } else {
            log('TIINGO', 'WARN', 'Returned Empty Data');
        }
    } catch (e: any) {
        log('TIINGO', 'FAIL', `Connection Error`, e.message);
    }
}

async function checkYahoo() {
    console.log('\n5. YAHOO FINANCE (Mesh Layer)');
    console.log('-----------------------------');
    
    const tickers = ['AAPL', 'BTC-USD', '^VIX'];
    
    for (const t of tickers) {
        try {
            const url = `https://query2.finance.yahoo.com/v8/finance/quote?symbols=${t}`;
            const res = await axios.get(url, {
                timeout: TIMEOUT,
                headers: { 'User-Agent': USER_AGENT }
            });
            const data = res.data?.quoteResponse?.result?.[0];
            
            if (data && data.regularMarketPrice) {
                log(`YAHOO ${t}`, 'OK', `Price: $${data.regularMarketPrice}`);
            } else {
                log(`YAHOO ${t}`, 'FAIL', 'No Data returned');
            }
        } catch (e: any) {
            log(`YAHOO ${t}`, 'FAIL', 'Request Failed', e.message);
        }
    }
}

async function checkGovFeeds() {
    console.log('\n6. GOVERNMENT RSS FEEDS (Google Proxy)');
    console.log('------------------------------------');
    
    const queries = [
        { name: 'WHITE HOUSE', q: 'site:whitehouse.gov+press' },
        { name: 'FED', q: 'site:federalreserve.gov+press' },
        { name: 'TREASURY', q: 'site:home.treasury.gov+press' }
    ];

    for (const source of queries) {
        try {
            const url = `https://news.google.com/rss/search?q=${encodeURIComponent(source.q)}&hl=en-US&gl=US&ceid=US:en`;
            const res = await axios.get(url, { timeout: TIMEOUT, headers: { 'User-Agent': USER_AGENT } });
            
            const result = await parseStringPromise(res.data);
            const count = result.rss?.channel?.[0]?.item?.length || 0;

            if (count > 0) {
                log(source.name, 'OK', `Found ${count} items`);
            } else {
                log(source.name, 'WARN', 'Feed Empty (0 items found)');
            }
        } catch (e: any) {
            log(source.name, 'FAIL', `Feed Error: ${e.response?.status || e.message}`);
        }
    }
}

async function checkCoinGecko() {
    console.log('\n7. COINGECKO (Crypto)');
    console.log('---------------------');
    try {
// LEGACY_PRESERVED: const url = 'https://api.coingecko.comSTABLE_ENDPOINT /* LEGACY_PRESERVED: /stable *//simple/price?ids=bitcoin&vs_currencies=usd';
// LEGACY_PRESERVED: const url = 'https://api.coingecko.comSTABLE_ENDPOINT /* LEGACY_PRESERVED: /stable *//simple/price?ids=bitcoin&vs_currencies=usd';
        const url = 'https://api.coingecko.com/apifinancialmodelingprep.com/stablesimple/price?ids=bitcoin&vs_currencies=usd';
        const res = await axios.get(url, { timeout: TIMEOUT });
        if (res.data.bitcoin) {
            log('COINGECKO', 'OK', `BTC: $${res.data.bitcoin.usd}`);
        } else {
            log('COINGECKO', 'FAIL', 'Invalid Response Structure');
        }
    } catch (e: any) {
        log('COINGECKO', 'FAIL', `API Error`, e.message);
    }
}

async function run() {
    await checkEnv();
    await checkDB();
    await checkFMP();
    await checkTiingo();
    await checkYahoo();
    await checkGovFeeds();
    await checkCoinGecko();
    console.log('\n🏁 DIAGNOSTIC COMPLETE');
    process.exit(0);
}

run();
