import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_KEY = "RqU4R074T8aTT9V5aMLm25j3Ff4AT3Ko";
const STOCK = "AAPL";
const CRYPTO = "BTCUSD";

const ENDPOINTS = {
    price: [
        { name: 'Quote Short', url: `https://financialmodelingprep.com/stable/quote-short/${STOCK}?apikey=${API_KEY}` },
        { name: 'Real-time',   url: `https://financialmodelingprep.com/stable/stock/real-time-price/${STOCK}?apikey=${API_KEY}` },
        { name: 'Quote v3',    url: `https://financialmodelingprep.com/stable/quote/${STOCK}?apikey=${API_KEY}` },
        { name: 'Profile',     url: `https://financialmodelingprep.com/stable/profile/${STOCK}?apikey=${API_KEY}` },
        { name: 'OTC Quote',   url: `https://financialmodelingprep.com/stable/otc/real-time-price/${STOCK}?apikey=${API_KEY}` }
    ],
    history: [
        { name: 'Full History', url: `https://financialmodelingprep.com/stable/historical-price-full/${STOCK}?apikey=${API_KEY}&serietype=line` },
        { name: '4 Hour Chart', url: `https://financialmodelingprep.com/stable/historical-chart/4hour/${STOCK}?apikey=${API_KEY}` },
        { name: 'Daily Chart',  url: `https://financialmodelingprep.com/stable/historical-chart/1day/${STOCK}?apikey=${API_KEY}` }
    ]
};

async function findWorkingEndpoint(candidates: any[]) {
    for (const ep of candidates) {
        try {
            process.stdout.write(`   Testing ${ep.name}...`);
            const res = await axios.get(ep.url, { timeout: 5000 });
            
            // Validate data
            let valid = false;
            if (Array.isArray(res.data) && res.data.length > 0) valid = true;
            if (res.data.price) valid = true;
            if (res.data.historical) valid = true;
            
            if (valid) {
                console.log(' ✅ WORKED');
                return ep; // Return the working config
            } else {
                console.log(' ❌ Empty Data');
            }
        } catch (e: any) {
            console.log(` ❌ Failed (${e.response?.status || e.code})`);
        }
    }
    return null;
}

async function generateServices(priceConfig: any, historyConfig: any) {
    if (!priceConfig || !historyConfig) {
        console.error("❌ Could not find working endpoints for your plan.");
        return;
    }

    console.log("\n🛠️  Rewriting Services with Valid Endpoints...");

    // 1. MARKET DATA SERVICE (Live)
    // We replace the hardcoded stock symbol with ${ticker} literal for the template
    const priceUrlTemplate = priceConfig.url.replace(STOCK, '${ticker}');
    
    const marketServiceCode = `
import axios from 'axios';

interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  source: string;
}

class MarketDataService {
  // Using Discovered Endpoint: ${priceConfig.name}
  async getStockPrice(symbol: string): Promise<StockQuote | null> {
    let ticker = symbol.toUpperCase();
    if (['BTC', 'ETH', 'SOL', 'DOGE'].includes(ticker)) ticker = "\${ticker}USD";

    try {
      // Auto-Discovered URL
      const url = \`${priceUrlTemplate}\`;
      const res = await axios.get(url, { timeout: 5000 });
      
      // Parser for ${priceConfig.name}
      let price = 0;
      let vol = 0;
      
      if (Array.isArray(res.data) && res.data.length > 0) {
          price = res.data[0].price || res.data[0].close || 0;
          vol = res.data[0].volume || 0;
      } else if (res.data.price) {
          price = res.data.price;
      }

      if (price > 0) {
        return {
          symbol: ticker,
          price: price,
          change: 0, changePercent: 0, volume: vol,
          source: 'FMP(${priceConfig.name})'
        };
      }
    } catch (e: any) {
       console.error(\`FMP Live Error for \${ticker}: \${e.message}\`);
    }
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

    // 2. HISTORICAL SERVICE
    const histUrlTemplate = historyConfig.url.replace(STOCK, '${ticker}');
    
    const historyServiceCode = `
import axios from 'axios';

class HistoricalDataService {
  // Using Discovered Endpoint: ${historyConfig.name}
  async getPriceHistory(symbol: string) {
    let ticker = symbol.toUpperCase();
    if (['BTC', 'ETH', 'SOL'].includes(ticker)) ticker = "\${ticker}USD";

    try {
        const url = \`${histUrlTemplate}\`;
        const res = await axios.get(url, { timeout: 8000 });
        
        let rawData = [];
        
        // Handle different FMP formats
        if (res.data.historical) rawData = res.data.historical;
        else if (Array.isArray(res.data)) rawData = res.data;

        if (rawData.length > 0) {
             // Normalize
             const data = rawData.map((d: any) => ({
                 date: new Date(d.date),
                 close: d.close
             })).sort((a: any, b: any) => a.date - b.date); // Ensure ASC sort
             
             console.log(\`   ✅ History (${historyConfig.name}): \${ticker} (\${data.length})\ \`);
             return data;
        }
    } catch (e: any) {
        console.error(\`FMP History Error: \${e.message}\`);
    }
    return [];
  }
}
export default new HistoricalDataService();
`;

    fs.writeFileSync(path.join(__dirname, '../services/marketDataService.ts'), marketServiceCode);
    fs.writeFileSync(path.join(__dirname, '../services/historicalDataService.ts'), historyServiceCode);
    
    console.log("✅ Services Updated Successfully.");
}

async function run() {
    console.log("🔍 Finding working Live Price endpoint...");
    const workingPrice = await findWorkingEndpoint(ENDPOINTS.price);
    
    console.log("\n🔍 Finding working History endpoint...");
    const workingHistory = await findWorkingEndpoint(ENDPOINTS.history);
    
    await generateServices(workingPrice, workingHistory);
}

run();
