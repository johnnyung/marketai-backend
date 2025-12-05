import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FMP_KEY = "RqU4R074T8aTT9V5aMLm25j3Ff4AT3Ko";
const TIINGO_KEY = process.env.TIINGO_API_KEY;

// Endpoints to test for FMP (New accounts often blocked on v3/quote)
const FMP_CANDIDATES = [
    { name: 'Quote Short', url: `https://financialmodelingprep.com/stable/quote-short/AAPL?apikey=${FMP_KEY}` },
    { name: 'Real-time',   url: `https://financialmodelingprep.com/stable/stock/real-time-price/AAPL?apikey=${FMP_KEY}` },
    { name: 'Profile',     url: `https://financialmodelingprep.com/stable/profile/AAPL?apikey=${FMP_KEY}` },
    { name: 'V4 Standard', url: `https://financialmodelingprep.com/stable/quote/AAPL?apikey=${FMP_KEY}` } // Sometimes V4 works
];

async function findWorkingFMPEndpoint() {
    console.log("🔍 Probing FMP Endpoints for your Key...");
    for (const ep of FMP_CANDIDATES) {
        try {
            process.stdout.write(`   Testing ${ep.name}...`);
            const res = await axios.get(ep.url, { timeout: 5000 });
            
            // Check if we got valid data back
            let valid = false;
            if (Array.isArray(res.data) && res.data.length > 0) valid = true;
            if (res.data.price) valid = true;
            if (res.data.symbol) valid = true;

            if (valid) {
                console.log(' ✅ SUCCESS');
                return ep;
            } else {
                console.log(' ❌ Empty Response');
            }
        } catch (e: any) {
            console.log(` ❌ Error ${e.response?.status || 'Timeout'}`);
        }
    }
    return null; // None worked
}

async function rewriteServices(fmpConfig: any) {
    
    // 1. MARKET DATA SERVICE (LIVE)
    // We inject the specific working URL into the code
    let fmpCodeBlock = "";
    
    if (fmpConfig) {
        // Convert specific AAPL url to template
        const urlTemplate = fmpConfig.url.replace('AAPL', '\${ticker}');
        
        fmpCodeBlock = `
        // 1. FMP (Primary - ${fmpConfig.name})
        try {
            const url = \`${urlTemplate}\`;
            const res = await axios.get(url, { timeout: 4000 });
            let price = 0;
            let vol = 0;

            if (Array.isArray(res.data) && res.data.length > 0) {
                price = res.data[0].price || res.data[0].close || 0;
                vol = res.data[0].volume || 0;
            } else if (res.data.price) {
                price = res.data.price;
            }
            
            if (price > 0) {
                return { symbol: ticker, price, change: 0, changePercent: 0, volume: vol, source: 'FMP' };
            }
        } catch (e) { /* FMP Failed, drop to next */ }
        `;
    }

    const serviceContent = `
import axios from 'axios';
import tiingoService from './tiingoService.js';

interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  source: string;
}

class MarketDataService {
  async getStockPrice(symbol: string): Promise<StockQuote | null> {
    // Normalize
    let ticker = symbol.toUpperCase();
    if (['BTC', 'ETH', 'SOL', 'DOGE'].includes(ticker)) ticker = "\${ticker}USD";

    ${fmpCodeBlock}

    // 2. TIINGO (Secondary / Backup)
    const tiingo = await tiingoService.getPrice(symbol);
    if (tiingo) return { ...tiingo, symbol, change: 0, changePercent: 0 };

    // 3. YAHOO (Emergency Backup)
    try {
        const yUrl = \`https://query1.finance.yahoo.com/v8/finance/chart/\${ticker}?interval=1d&range=1d\`;
        const res = await axios.get(yUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 3000 });
        const result = res.data?.chart?.result?.[0];
        if (result?.meta?.regularMarketPrice) {
             return { symbol: ticker, price: result.meta.regularMarketPrice, change: 0, changePercent: 0, source: 'Yahoo' };
        }
    } catch(e) {}

    return null;
  }

  async getMultiplePrices(symbols: string[]) {
    const map = new Map();
    for(const s of symbols) {
        map.set(s, await this.getStockPrice(s));
        await new Promise(r => setTimeout(r, 100));
    }
    return map;
  }
}

export default new MarketDataService();
`;

    fs.writeFileSync(path.join(__dirname, '../services/marketDataService.ts'), serviceContent);
    console.log("✅ MarketDataService rewritten with working configuration.");
}

async function run() {
    const workingFMP = await findWorkingFMPEndpoint();
    
    if (!workingFMP) {
        console.log("⚠️  WARNING: No working FMP endpoint found for this key.");
        console.log("    The system will rely on Tiingo and Yahoo.");
    } else {
        console.log(`🎯 Locked onto FMP Endpoint: ${workingFMP.name}`);
    }

    await rewriteServices(workingFMP);
}

run();
