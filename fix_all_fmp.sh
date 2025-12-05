#!/bin/bash

# ============================================================
# MARKET_AI v113.0 - FIX ALL FMP (PHASE F1)
# ============================================================
# Purpose:
# 1. Patches FmpService to strict Stable API (Query Params).
# 2. Patches PriceService for robust error handling.
# 3. Installs Verification Scripts.
# 4. Updates tsconfig to compile scripts.
# 5. Builds and Verifies.
# Target:  ~/Desktop/marketai-backend
# ============================================================

# Define the target directory
TARGET_DIR="$HOME/Desktop/marketai-backend"

# Check if directory exists
if [ ! -d "$TARGET_DIR" ]; then
    echo "❌ CRITICAL: Directory not found at $TARGET_DIR"
    exit 1
fi

cd "$TARGET_DIR" || exit
echo "✅ Operational Context: $(pwd)"

# ---------------------------------------------------------
# STEP 1: REWRITE fmpService.ts (STRICT STABLE API)
# ---------------------------------------------------------
echo ">>> (1/7) Rewriting src/services/fmpService.ts..."

cat << 'EOF' > src/services/fmpService.ts
import axios from 'axios';
import { Candle } from '../types/dataProviderTypes.js';

/**
 * FMP Service (Phase F1 - Final Stable Alignment)
 * -----------------------------------------------
 * Base URL: https://financialmodelingprep.com/stable
 * Enforces: Query Parameters (?symbol=) for ALL endpoints.
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

  constructor() {
    this.apiKey = process.env.FMP_API_KEY || '';
    if (!this.apiKey) console.error('[FMP] CRITICAL: API Key Missing');
  }

  private async fetchRaw(path: string, category: string = 'general'): Promise<any> {
    if (this.capabilities[category] === 'UNAVAILABLE') return null;
    if (!this.apiKey) return null;
    
    try {
      // Ensure no leading slash on path for cleaner joining
      const cleanPath = path.startsWith('/') ? path.substring(1) : path;
      // Check if path already has query params
      const separator = cleanPath.includes('?') ? '&' : '?';
      const url = `${this.baseUrl}/${cleanPath}${separator}apikey=${this.apiKey}`;
      
      const masked = url.replace(this.apiKey, 'HIDDEN');
      
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
          console.warn(`[FMP] Capability Disabled: ${category} (${status}) - ${path}`);
          this.capabilities[category] = 'UNAVAILABLE';
      } else {
          console.error(`[FMP] Network Error: ${error.message}`);
      }
      return null;
    }
  }

  // --- 1. MARKET DATA ---

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
    // /stable/historical-price-full?symbol=AAPL&timeseries=30
    const data = await this.fetchRaw(`historical-price-full?symbol=${ticker}&timeseries=${limit}`, 'historical');
    return data && data.historical ? data.historical : [];
  }

  async getIntraday(ticker: string, interval: string = '5min'): Promise<any[]> {
    // /stable/historical-chart/5min?symbol=AAPL (Stable convention)
    return await this.fetchRaw(`historical-chart/${interval}?symbol=${ticker}`, 'intraday') || [];
  }

  // --- 2. COMPANY ---

  async getCompanyProfile(ticker: string): Promise<any> {
    const data = await this.fetchRaw(`profile?symbol=${ticker}`, 'profile');
    return data && data[0] ? data[0] : null;
  }

  // --- 3. FINANCIALS ---

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

  // --- 4. NEWS ---

  async getCompanyNews(ticker: string, limit: number = 10): Promise<any[]> {
    return await this.fetchRaw(`news?symbol=${ticker}&limit=${limit}`, 'news') || [];
  }

  async getMarketNews(limit: number = 20): Promise<any[]> {
    return await this.fetchRaw(`news?limit=${limit}`, 'news') || [];
  }

  // --- 5. INSIDER & INSTITUTIONAL ---

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

  // --- 6. MACRO & OPTIONS ---

  async getOptionChain(ticker: string): Promise<any[]> {
    return await this.fetchRaw(`options-chain?symbol=${ticker}`, 'options') || []; 
  }

  async getEconomicIndicator(name: string): Promise<any[]> {
    return await this.fetchRaw(`economic?symbol=${encodeURIComponent(name)}`, 'economic') || [];
  }
  
  async getEconomicData(name: string): Promise<any[]> { return this.getEconomicIndicator(name); }
  async getTreasuryRates(): Promise<any[]> { return this.getEconomicIndicator('10Y'); }

  // --- 7. LISTS ---

  async getSP500Constituents(): Promise<any[]> {
    return await this.fetchRaw('sp500_constituents', 'index') || [];
  }
  
  async getSP500List(): Promise<any[]> { return this.getSP500Constituents(); }

  // --- 8. TECHNICALS ---

  async getRSI(ticker: string, period: number = 14): Promise<any[]> {
    return await this.fetchRaw(`technical-indicator/rsi?symbol=${ticker}&period=${period}`, 'technical') || [];
  }

  async getSMA(ticker: string, period: number = 50): Promise<any[]> {
    return await this.fetchRaw(`technical-indicator/sma?symbol=${ticker}&period=${period}`, 'technical') || [];
  }

  // --- UTILS ---

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
# STEP 2: REWRITE priceService.ts (ROBUST)
# ---------------------------------------------------------
echo ">>> (2/7) Rewriting src/services/priceService.ts..."

cat << 'EOF' > src/services/priceService.ts
import fmpService from './fmpService.js';

class PriceService {
  
  /**
   * Gets the current price safely.
   * Handles FMP Stable response normalization.
   * Returns explicit capability status instead of throwing on 404.
   */
  async getCurrentPrice(ticker: string): Promise<any> {
    try {
        const raw = await fmpService.getPrice(ticker);
        
        let price: number | null = null;
        let change = 0;
        let changePercent = 0;

        // Normalize: Object vs Array vs Null
        if (raw) {
            if (typeof raw.price === 'number') {
                price = raw.price;
                change = raw.change || 0;
                changePercent = raw.changePercent || raw.changesPercentage || 0;
            }
            else if (Array.isArray(raw) && raw.length > 0 && typeof raw[0].price === 'number') {
                price = raw[0].price;
                change = raw[0].change || 0;
                changePercent = raw[0].changePercent || raw[0].changesPercentage || 0;
            }
        }

        if (price === null) {
            console.warn(`[PriceService] No valid price found for ${ticker}`);
            return {
                ticker: ticker.toUpperCase(),
                price: null,
                capability: 'UNAVAILABLE',
                raw
            };
        }
        
        return {
            ticker: ticker.toUpperCase(),
            price,
            change,
            changePercent,
            timestamp: new Date(),
            capability: 'OK'
        };

    } catch (e: any) {
        console.warn(`[PriceService] Error fetching ${ticker}: ${e.message}`);
        return { 
            ticker: ticker.toUpperCase(), 
            price: null, 
            capability: 'ERROR', 
            error: e.message 
        };
    }
  }

  // Legacy Alias
  async getPrice(ticker: string) {
      return this.getCurrentPrice(ticker);
  }
}

export default new PriceService();
EOF

# ---------------------------------------------------------
# STEP 3: CREATE VALIDATION SCRIPT
# ---------------------------------------------------------
echo ">>> (3/7) Creating src/scripts/verifyFmpCore.ts..."

mkdir -p src/scripts

cat << 'EOF' > src/scripts/verifyFmpCore.ts
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

import fmpService from '../services/fmpService.js';

async function main() {
  try {
    console.log('🔍 Running FMP Core Verification (Phase F1)...');
    
    if (!process.env.FMP_API_KEY) {
        console.error('❌ NO API KEY FOUND');
        process.exit(1);
    }
    console.log('   Key Present:', process.env.FMP_API_KEY.substring(0,4) + '...');

    console.log('   Fetching Price (quote?symbol=AAPL)...');
    const price = await fmpService.getPrice('AAPL');
    
    console.log('   Fetching Profile (profile?symbol=AAPL)...');
    const profile = await fmpService.getCompanyProfile('AAPL');
    
    console.log('   Fetching SP500 (sp500_constituents)...');
    const sp500 = await fmpService.getSP500Constituents();

    console.log('\n--- RESULTS ---');
    console.log('Price:', price ? `✅ ${price.price}` : '❌ NULL');
    console.log('Profile:', profile ? `✅ ${profile.companyName}` : '❌ NULL');
    console.log('SP500:', Array.isArray(sp500) && sp500.length > 0 ? `✅ Array[${sp500.length}]` : '❌ EMPTY/NULL');

    const ok = price && profile; // Strict check on core data
    // SP500 might be 404 on some plans, so we warn but don't fail the script if price works
    if (!Array.isArray(sp500) || sp500.length === 0) {
        console.warn('⚠️  SP500 List unavailable (Plan restriction?).');
    }

    if (!ok) {
      console.error('❌ Critical FMP Core Failure.');
      process.exit(1);
    }

    console.log('✅ FMP Core Verified.');
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Verification Error:', err?.message || err);
    process.exit(1);
  }
}

main();
EOF

# ---------------------------------------------------------
# STEP 4: CREATE RUNNER SCRIPT
# ---------------------------------------------------------
echo ">>> (4/7) Creating scripts/run_fmp_core_check.sh..."

mkdir -p scripts

cat << 'EOF' > scripts/run_fmp_core_check.sh
#!/bin/bash
set -e

# Determine backend root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${ROOT_DIR}"

echo ">>> Building backend..."
npm run build

echo ">>> Running FMP core verification..."
if [ -f "dist/scripts/verifyFmpCore.js" ]; then
    node -r dotenv/config dist/scripts/verifyFmpCore.js
else
    echo "❌ CRITICAL: compiled script not found."
    exit 1
fi

echo "✅ Check Passed."
EOF
chmod +x scripts/run_fmp_core_check.sh

# ---------------------------------------------------------
# STEP 5: UPDATE TSCONFIG
# ---------------------------------------------------------
echo ">>> (5/7) Updating tsconfig.json..."

cat << 'EOF' > tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "rootDir": "./src",
    "outDir": "./dist",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": false,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*", "src/scripts/**/*"],
  "exclude": ["node_modules", "**/*.test.ts"]
}
EOF

# ---------------------------------------------------------
# STEP 6: BUILD
# ---------------------------------------------------------
echo ">>> (6/7) Building Project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ BUILD FAILED."
    exit 1
fi

# ---------------------------------------------------------
# STEP 7: VERIFY
# ---------------------------------------------------------
echo ">>> (7/7) Running Verification..."
node -r dotenv/config dist/scripts/verifyFmpCore.js

if [ $? -eq 0 ]; then
    echo "✅ FIX_ALL_FMP COMPLETE."
    echo "   Stable API fully enforced."
else
    echo "❌ VERIFICATION FAILED."
    exit 1
fi
