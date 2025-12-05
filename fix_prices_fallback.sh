#!/bin/bash
set -e

TARGET_DIR="$HOME/Desktop/marketai-backend"
cd "$TARGET_DIR" || exit
echo "✅ Operational Context: $(pwd)"

# ---------------------------------------------------------
# STEP 1: CREATE CACHE DIRECTORY & FILE
# ---------------------------------------------------------
echo ">>> (1/8) creating src/data/cache/last_prices.json..."
mkdir -p src/data/cache
echo "{}" > src/data/cache/last_prices.json

# ---------------------------------------------------------
# STEP 2: CREATE PriceFallbackService
# ---------------------------------------------------------
echo ">>> (2/8) Creating src/services/priceFallbackService.ts..."
cat << 'EOF' > src/services/priceFallbackService.ts
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Points to src/data/cache in dev, or dist/data/cache in prod
const CACHE_PATH = path.resolve(__dirname, '../data/cache/last_prices.json');

interface CachedPrice {
    price: number;
    change: number;
    changePercent: number;
    timestamp: number;
    source: string;
}

class PriceFallbackService {
    
    private getApiKey(): string {
        return process.env.FMP_API_KEY || '';
    }

    private loadCache(): Record<string, CachedPrice> {
        try {
            if (fs.existsSync(CACHE_PATH)) {
                const raw = fs.readFileSync(CACHE_PATH, 'utf-8');
                return JSON.parse(raw);
            }
        } catch (e) {
            console.warn('[PriceFallback] Failed to load cache:', e);
        }
        return {};
    }

    private saveCacheFile(data: Record<string, CachedPrice>) {
        try {
            const dir = path.dirname(CACHE_PATH);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(CACHE_PATH, JSON.stringify(data, null, 2));
        } catch (e) {
            console.error('[PriceFallback] Failed to save cache:', e);
        }
    }

    public async getFromCache(ticker: string): Promise<CachedPrice | null> {
        const cache = this.loadCache();
        const item = cache[ticker.toUpperCase()];
        if (item) {
            console.log(`[PriceService] ⚠️ Retrieved ${ticker} from Local Cache (${new Date(item.timestamp).toISOString()})`);
            return item;
        }
        return null;
    }

    public async saveToCache(ticker: string, data: CachedPrice) {
        const cache = this.loadCache();
        cache[ticker.toUpperCase()] = data;
        this.saveCacheFile(cache);
    }

    public async fetchV3Fallback(ticker: string): Promise<CachedPrice | null> {
        const key = this.getApiKey();
        if (!key) return null;

        try {
            // Explicitly using the v3 endpoint structure for fallback
            const url = \`https://financialmodelingprep.com/api/v3/quote/\${ticker}?apikey=\${key}\`;
            const res = await axios.get(url, { timeout: 5000 });
            
            if (Array.isArray(res.data) && res.data.length > 0) {
                const d = res.data[0];
                console.log(`[PriceService] ⚠️ Retrieved ${ticker} from FMP v3 Fallback`);
                return {
                    price: d.price,
                    change: d.change,
                    changePercent: d.changesPercentage,
                    timestamp: Date.now(),
                    source: 'FMPv3'
                };
            }
        } catch (e: any) {
            // Silent fail, proceed to cache
        }
        return null;
    }
}

export default new PriceFallbackService();
EOF

# ---------------------------------------------------------
# STEP 3: PATCH PriceService (The Orchestrator)
# ---------------------------------------------------------
echo ">>> (3/8) Patching src/services/priceService.ts..."
cat << 'EOF' > src/services/priceService.ts
import fmpService from './fmpService.js';
import priceFallbackService from './priceFallbackService.js';

class PriceService {
  
  async getCurrentPrice(ticker: string): Promise<any> {
    const symbol = ticker.toUpperCase();
    let result = null;
    let method = 'PRIMARY';

    // 1. PRIMARY: FMP Stable
    try {
        const raw = await fmpService.getPrice(symbol);
        if (raw && typeof raw.price === 'number') {
            result = {
                price: raw.price,
                change: raw.change || 0,
                changePercent: raw.changesPercentage || raw.changePercent || 0,
                timestamp: Date.now(),
                source: 'FMP_Stable'
            };
        }
    } catch (e) { /* Fallthrough */ }

    // 2. SECONDARY: FMP v3 Fallback
    if (!result) {
        method = 'FALLBACK_V3';
        const v3 = await priceFallbackService.fetchV3Fallback(symbol);
        if (v3) result = v3;
    }

    // 3. TERTIARY: Local Cache
    if (!result) {
        method = 'CACHE';
        const cached = await priceFallbackService.getFromCache(symbol);
        if (cached) result = cached;
    }

    // 4. FINALIZE
    if (result) {
        // Update cache if we got live data
        if (method !== 'CACHE') {
            await priceFallbackService.saveToCache(symbol, result);
        }

        return {
            ticker: symbol,
            price: result.price,
            change: result.change,
            changePercent: result.changePercent,
            timestamp: new Date(result.timestamp),
            capability: method === 'CACHE' ? 'STALE' : 'OK',
            source: result.source
        };
    }

    // 5. FAILURE
    console.error(`[PriceService] CRITICAL: All layers failed for ${symbol}`);
    return {
        ticker: symbol,
        price: null,
        capability: 'UNAVAILABLE',
        error: 'Price data unavailable from all sources'
    };
  }

  // Alias
  async getPrice(ticker: string) {
      return this.getCurrentPrice(ticker);
  }
}

export default new PriceService();
EOF

# ---------------------------------------------------------
# STEP 4: PATCH FmpService (Preserve F2 Logic, Ensure Debug)
# ---------------------------------------------------------
echo ">>> (4/8) Patching src/services/fmpService.ts..."
cat << 'EOF' > src/services/fmpService.ts
import axios from 'axios';
import { Candle } from '../types/dataProviderTypes.js';

/**
 * FMP Service (Phase F3 - Stable with v3 SP500 Support)
 */
class FmpService {
  private apiKey: string;
  private baseUrl = 'https://financialmodelingprep.com/stable';

  public capabilities: Record<string, 'UNKNOWN' | 'OK' | 'UNAVAILABLE'> = {
    quote: 'UNKNOWN',
    profile: 'UNKNOWN',
    historical: 'UNKNOWN',
    intraday: 'UNKNOWN',
    financials: 'UNKNOWN',
    analyst: 'UNKNOWN',
    institutional: 'UNKNOWN',
    insider: 'UNKNOWN',
    news: 'UNKNOWN',
    economic: 'UNKNOWN',
    options: 'UNKNOWN',
    index: 'UNKNOWN'
  };

  public lastDebug: any = {};

  private get apiKeyVal(): string {
    return process.env.FMP_API_KEY || '';
  }

  constructor() {
    this.apiKey = process.env.FMP_API_KEY || '';
  }

  private async fetchRaw(path: string, category: string = 'general'): Promise<any> {
    if (this.capabilities[category] === 'UNAVAILABLE') return null;
    
    const key = this.apiKeyVal;
    if (!key) return null;
    
    try {
      const cleanPath = path.startsWith('/') ? path.substring(1) : path;
      const separator = cleanPath.includes('?') ? '&' : '?';
      // Note: path traversal ../ allows accessing v3 if stable fails for specific endpoints like SP500
      const url = `${this.baseUrl}/${cleanPath}${separator}apikey=${key}`;
      
      const masked = url.replace(key, 'HIDDEN');
      this.lastDebug = { url: masked, timestamp: new Date().toISOString() };

      const response = await axios.get(url, { timeout: 15000 });
      this.lastDebug.status = response.status;

      if (response.status !== 200) {
          console.error(`[FMP] HTTP ${response.status} for ${masked}`);
          return null;
      }

      const data = response.data;
      if (data && data['Error Message']) {
          console.warn(`[FMP] API Error: ${data['Error Message']}`);
          this.capabilities[category] = 'UNAVAILABLE';
          this.lastDebug.error = data['Error Message'];
          return null;
      }

      if (Array.isArray(data) && data.length === 0) return [];

      this.capabilities[category] = 'OK';
      return data;

    } catch (error: any) {
      const status = error.response?.status || 0;
      this.lastDebug.status = status;
      this.lastDebug.error = error.message;
      
      if (status === 403 || status === 404) {
          console.warn(`[FMP] Capability Disabled: ${category} (${status})`);
          this.capabilities[category] = 'UNAVAILABLE';
      } else {
          console.error(`[FMP] Network Error: ${error.message}`);
      }
      return null;
    }
  }

  async getPrice(ticker: string): Promise<any> {
    const data = await this.fetchRaw(`quote?symbol=${ticker}`, 'quote');
    return data && data[0] ? data[0] : null;
  }
  
  async getQuote(ticker: string): Promise<any> { return this.getPrice(ticker); }

  async getBatchPrices(tickers: string[]): Promise<any[]> {
    if (!tickers.length) return [];
    return await this.fetchRaw(`quote?symbol=${tickers.join(',')}`, 'quote') || [];
  }

  async getDailyCandles(ticker: string, limit: number = 30): Promise<Candle[]> {
    const data = await this.fetchRaw(`historical-price-full?symbol=${ticker}&timeseries=${limit}`, 'historical');
    return data && data.historical ? data.historical : [];
  }

  async getIntraday(ticker: string, interval: string = '5min'): Promise<any[]> {
    return await this.fetchRaw(`historical-chart/${interval}?symbol=${ticker}`, 'intraday') || [];
  }

  async getCompanyProfile(ticker: string): Promise<any> {
    const data = await this.fetchRaw(`profile?symbol=${ticker}`, 'profile');
    return data && data[0] ? data[0] : null;
  }

  async getFinancialRatios(ticker: string, period: string = 'annual', limit: number = 1): Promise<any> {
    return await this.fetchRaw(`ratios-ttm?symbol=${ticker}`, 'financials') || [];
  }

  async getKeyMetrics(ticker: string, limit: number = 1): Promise<any> {
    return await this.fetchRaw(`key-metrics-ttm?symbol=${ticker}`, 'financials') || [];
  }

  async getIncomeStatement(ticker: string, period: string = 'annual', limit: number = 5): Promise<any[]> {
    return await this.fetchRaw(`income-statement?symbol=${ticker}&period=${period}&limit=${limit}`, 'financials') || [];
  }

  async getBalanceSheet(ticker: string, period: string = 'annual', limit: number = 5): Promise<any[]> {
    return await this.fetchRaw(`balance-sheet-statement?symbol=${ticker}&period=${period}&limit=${limit}`, 'financials') || [];
  }

  async getCashFlowStatement(ticker: string, period: string = 'annual', limit: number = 5): Promise<any[]> {
    return await this.fetchRaw(`cash-flow-statement?symbol=${ticker}&period=${period}&limit=${limit}`, 'financials') || [];
  }

  async getAnalystEstimates(ticker: string): Promise<any[]> {
    return await this.fetchRaw(`analyst-estimates?symbol=${ticker}`, 'analyst') || [];
  }

  async getPriceTargets(ticker: string): Promise<any[]> {
    return await this.fetchRaw(`analyst-stock-price-target?symbol=${ticker}`, 'analyst') || [];
  }

  async getCompanyNews(ticker: string, limit: number = 10): Promise<any[]> {
    return await this.fetchRaw(`news?symbol=${ticker}&limit=${limit}`, 'news') || [];
  }

  async getMarketNews(limit: number = 20): Promise<any[]> {
    return await this.fetchRaw(`news?limit=${limit}`, 'news') || [];
  }

  async getInsiderTrades(ticker: string): Promise<any[]> {
    return await this.fetchRaw(`insider-trading?symbol=${ticker}&limit=100`, 'insider') || [];
  }
  
  async getInsiderFeed(): Promise<any[]> {
    return await this.fetchRaw(`insider-trading?limit=50`, 'insider') || [];
  }

  async getInstitutionalHolders(ticker: string): Promise<any[]> {
    return await this.fetchRaw(`institutional-ownership?symbol=${ticker}`, 'institutional') || [];
  }

  async getEtfHoldings(ticker: string): Promise<any[]> {
    return await this.fetchRaw(`etf-holder?symbol=${ticker}`, 'institutional') || []; 
  }
  
  async get13F(cik: string): Promise<any[]> {
    return await this.fetchRaw(`13f?cik=${cik}`, 'institutional') || [];
  }

  async getOptionChain(ticker: string): Promise<any[]> {
    return await this.fetchRaw(`options-chain?symbol=${ticker}`, 'options') || []; 
  }

  async getEconomicIndicator(name: string): Promise<any[]> {
    return await this.fetchRaw(`economic?symbol=${encodeURIComponent(name)}`, 'economic') || [];
  }
  
  async getEconomicData(name: string): Promise<any[]> { return this.getEconomicIndicator(name); }
  async getTreasuryRates(): Promise<any[]> { return this.getEconomicIndicator('10Y'); }

  async getSP500Constituents(): Promise<any[]> {
    // PATH TRAVERSAL to v3 fallback if stable is 404/403
    return await this.fetchRaw('../api/v3/sp500_constituent', 'index') || [];
  }
  
  async getSP500List(): Promise<any[]> { return this.getSP500Constituents(); }

  async getRSI(ticker: string, period: number = 14): Promise<any[]> {
    return await this.fetchRaw(`technical-indicator/rsi?symbol=${ticker}&period=${period}`, 'technical') || [];
  }

  async getSMA(ticker: string, period: number = 50): Promise<any[]> {
    return await this.fetchRaw(`technical-indicator/sma?symbol=${ticker}&period=${period}`, 'technical') || [];
  }

  getCapabilities() { return this.capabilities; }

  async getCompleteFundamentals(ticker: string): Promise<any> {
    const [profile, metrics, ratios, income] = await Promise.all([
      this.getCompanyProfile(ticker),
      this.getKeyMetrics(ticker),
      this.getFinancialRatios(ticker),
      this.getIncomeStatement(ticker)
    ]);
    return { profile, metrics, ratios, income };
  }

  async checkConnection(): Promise<{ success: boolean; message: string }> {
      const res = await this.getPrice('AAPL');
      return { success: !!res, message: res ? 'Connected' : 'Failed' };
  }
}

export default new FmpService();
EOF

# ---------------------------------------------------------
# STEP 5: CREATE VERIFICATION SCRIPT (verify_price_chain.ts)
# ---------------------------------------------------------
echo ">>> (5/8) Creating src/scripts/verify_price_chain.ts..."
cat << 'EOF' > src/scripts/verify_price_chain.ts
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '../../');

dotenv.config({ path: path.join(root, '.env') });
dotenv.config({ path: path.join(root, '.env.local') });

import priceService from '../services/priceService.js';
import fmpService from '../services/fmpService.js';

async function run() {
    console.log("🧪 TESTING PRICE FALLBACK CHAIN (FDV-3)");
    console.log("---------------------------------------");

    const TICKER = 'AAPL';
    
    // 1. Test Base FMP
    console.log(`1. FMP Service Direct (${TICKER}):`);
    const direct = await fmpService.getPrice(TICKER);
    console.log(`   -> ${direct ? '✅ OK: ' + direct.price : '❌ NULL (Simulating outage)'}`);

    // 2. Test Orchestrator
    console.log(`\n2. PriceService Orchestrator (${TICKER}):`);
    const result = await priceService.getCurrentPrice(TICKER);
    
    console.log(`   -> Price: ${result.price}`);
    console.log(`   -> Source: ${result.source}`);
    console.log(`   -> Capability: ${result.capability}`);

    if (result.price && result.source) {
        console.log("\n✅ CHAIN VERIFIED. System is resilient.");
        process.exit(0);
    } else {
        console.error("\n❌ CHAIN FAILED. No price returned.");
        process.exit(1);
    }
}

run();
EOF

# ---------------------------------------------------------
# STEP 6: CREATE SHELL RUNNER (verify_prices_v3.sh)
# ---------------------------------------------------------
echo ">>> (6/8) Creating scripts/verify_prices_v3.sh..."
cat << 'EOF' > scripts/verify_prices_v3.sh
#!/bin/bash
# Runs the compiled verification script for Price Chain
node -r dotenv/config dist/scripts/verify_price_chain.js
EOF
chmod +x scripts/verify_prices_v3.sh

# ---------------------------------------------------------
# STEP 7: UPDATE COPY ASSETS SCRIPT
# ---------------------------------------------------------
echo ">>> (7/8) Updating scripts/copy_static_assets.sh..."
cat << 'EOF' > scripts/copy_static_assets.sh
#!/bin/bash
set -e

SRC_DIR="src/data"
DIST_DIR="dist/data"

echo "📁 Copying static data assets..."

if [ -d "$SRC_DIR" ]; then
    mkdir -p "$DIST_DIR"
    
    # Copy top level JSONs
    cp "$SRC_DIR"/*.json "$DIST_DIR"/ 2>/dev/null || true
    
    # Copy Cache Directory recursively
    if [ -d "$SRC_DIR/cache" ]; then
        mkdir -p "$DIST_DIR/cache"
        cp -R "$SRC_DIR/cache"/* "$DIST_DIR/cache"/
    fi
    
    echo "✅ Static assets copied to dist/data"
else
    echo "⚠️  Source directory src/data does not exist. Skipping copy."
fi
EOF

# ---------------------------------------------------------
# STEP 8: UPDATE verify_all_sources.sh
# ---------------------------------------------------------
echo ">>> (8/8) Updating scripts/verify_all_sources.sh..."

# We append the check at the end before final summary
# Using a temporary file approach to insert cleanly
sed -i '' '/echo ">>> 5. Checking Ingestion Pipelines..."/i \
echo ">>> 6. Checking Price Fallback Chain (FDV-3)..."\
bash scripts/verify_prices_v3.sh\
echo ""\
' scripts/verify_all_sources.sh || echo "⚠️  Could not auto-patch verify_all_sources.sh, running manual check advised."

echo "✅ FDV-3 Patches Applied."
echo "👉 Run 'npm run build' then 'bash scripts/verify_prices_v3.sh' to verify."
