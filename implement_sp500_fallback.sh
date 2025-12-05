#!/bin/bash

# ============================================================
# MARKET_AI - PHASE F3: ROBUST SP500 FALLBACK
# ============================================================
# 1. Creates src/data/sp500_constituents.static.json
# 2. Creates src/services/sp500FallbackService.ts
# 3. Wires it into src/services/tickerUniverseService.ts
# 4. Builds and Verifies
# ============================================================

TARGET_DIR="$HOME/Desktop/marketai-backend"
cd "$TARGET_DIR" || exit
echo "✅ Operational Context: $(pwd)"

# 1. Create Data Directory
mkdir -p src/data

# 2. Create Static Data File (Top ~50 S&P 500 by weight/popularity)
echo ">>> (1/4) Creating src/data/sp500_constituents.static.json..."
cat << 'EOF' > src/data/sp500_constituents.static.json
[
  {"symbol":"AAPL","name":"Apple Inc.","sector":"Information Technology"},
  {"symbol":"MSFT","name":"Microsoft Corporation","sector":"Information Technology"},
  {"symbol":"NVDA","name":"NVIDIA Corporation","sector":"Information Technology"},
  {"symbol":"AMZN","name":"Amazon.com Inc.","sector":"Consumer Discretionary"},
  {"symbol":"META","name":"Meta Platforms Inc.","sector":"Communication Services"},
  {"symbol":"GOOGL","name":"Alphabet Inc. Class A","sector":"Communication Services"},
  {"symbol":"GOOG","name":"Alphabet Inc. Class C","sector":"Communication Services"},
  {"symbol":"BRK.B","name":"Berkshire Hathaway Inc. Class B","sector":"Financials"},
  {"symbol":"LLY","name":"Eli Lilly and Company","sector":"Health Care"},
  {"symbol":"AVGO","name":"Broadcom Inc.","sector":"Information Technology"},
  {"symbol":"JPM","name":"JPMorgan Chase & Co.","sector":"Financials"},
  {"symbol":"TSLA","name":"Tesla Inc.","sector":"Consumer Discretionary"},
  {"symbol":"UNH","name":"UnitedHealth Group Incorporated","sector":"Health Care"},
  {"symbol":"XOM","name":"Exxon Mobil Corporation","sector":"Energy"},
  {"symbol":"V","name":"Visa Inc.","sector":"Financials"},
  {"symbol":"PG","name":"Procter & Gamble Company","sector":"Consumer Staples"},
  {"symbol":"MA","name":"Mastercard Incorporated","sector":"Financials"},
  {"symbol":"JNJ","name":"Johnson & Johnson","sector":"Health Care"},
  {"symbol":"HD","name":"Home Depot Inc.","sector":"Consumer Discretionary"},
  {"symbol":"COST","name":"Costco Wholesale Corporation","sector":"Consumer Staples"},
  {"symbol":"MRK","name":"Merck & Co. Inc.","sector":"Health Care"},
  {"symbol":"ABBV","name":"AbbVie Inc.","sector":"Health Care"},
  {"symbol":"CRM","name":"Salesforce Inc.","sector":"Information Technology"},
  {"symbol":"BAC","name":"Bank of America Corporation","sector":"Financials"},
  {"symbol":"CVX","name":"Chevron Corporation","sector":"Energy"},
  {"symbol":"NFLX","name":"Netflix Inc.","sector":"Communication Services"},
  {"symbol":"AMD","name":"Advanced Micro Devices Inc.","sector":"Information Technology"},
  {"symbol":"PEP","name":"PepsiCo Inc.","sector":"Consumer Staples"},
  {"symbol":"KO","name":"Coca-Cola Company","sector":"Consumer Staples"},
  {"symbol":"WMT","name":"Walmart Inc.","sector":"Consumer Staples"},
  {"symbol":"TMO","name":"Thermo Fisher Scientific Inc.","sector":"Health Care"},
  {"symbol":"LIN","name":"Linde plc","sector":"Materials"},
  {"symbol":"ACN","name":"Accenture plc","sector":"Information Technology"},
  {"symbol":"MCD","name":"McDonald's Corporation","sector":"Consumer Discretionary"},
  {"symbol":"DIS","name":"Walt Disney Company","sector":"Communication Services"},
  {"symbol":"CSCO","name":"Cisco Systems Inc.","sector":"Information Technology"},
  {"symbol":"ABT","name":"Abbott Laboratories","sector":"Health Care"},
  {"symbol":"INTC","name":"Intel Corporation","sector":"Information Technology"},
  {"symbol":"VZ","name":"Verizon Communications Inc.","sector":"Communication Services"},
  {"symbol":"CMCSA","name":"Comcast Corporation","sector":"Communication Services"},
  {"symbol":"INTU","name":"Intuit Inc.","sector":"Information Technology"},
  {"symbol":"QCOM","name":"Qualcomm Incorporated","sector":"Information Technology"},
  {"symbol":"TXN","name":"Texas Instruments Incorporated","sector":"Information Technology"},
  {"symbol":"NKE","name":"NIKE Inc.","sector":"Consumer Discretionary"},
  {"symbol":"UNP","name":"Union Pacific Corporation","sector":"Industrials"},
  {"symbol":"PM","name":"Philip Morris International Inc.","sector":"Consumer Staples"},
  {"symbol":"IBM","name":"International Business Machines","sector":"Information Technology"},
  {"symbol":"GE","name":"General Electric Company","sector":"Industrials"},
  {"symbol":"AMGN","name":"Amgen Inc.","sector":"Health Care"},
  {"symbol":"HON","name":"Honeywell International Inc.","sector":"Industrials"},
  {"symbol":"SPY","name":"SPDR S&P 500 ETF Trust","sector":"Financials"}
]
EOF

# 3. Create Fallback Service
echo ">>> (2/4) Creating src/services/sp500FallbackService.ts..."
cat << 'EOF' > src/services/sp500FallbackService.ts
import fmpService from './fmpService.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface Sp500UniverseResult {
  source: 'FMP' | 'LOCAL';
  tickers: string[];
  raw?: any;
}

class Sp500FallbackService {
  /**
   * Returns S&P 500 tickers from FMP, or falls back to local static file.
   * Designed to handle 403 Forbidden / Plan Restrictions gracefully.
   */
  async getSp500Universe(): Promise<Sp500UniverseResult> {
    // 1. Try FMP First
    try {
      // fmpService.getSP500List() calls /sp500_constituent
      const fmpData = await fmpService.getSP500List();
      
      if (Array.isArray(fmpData) && fmpData.length > 0) {
        const tickers = fmpData
          .map((item: any) => item.symbol)
          .filter((s: any) => typeof s === 'string' && s.length > 0);
        
        // Valid list check (arbitrary threshold > 10)
        if (tickers.length > 10) {
          return { source: 'FMP', tickers, raw: fmpData };
        }
      }
    } catch (e) {
      // Ignore FMP error, proceed to fallback
    }

    // 2. Fallback to Local JSON
    try {
      const localPath = path.join(__dirname, '../data/sp500_constituents.static.json');
      
      if (fs.existsSync(localPath)) {
        const rawData = fs.readFileSync(localPath, 'utf-8');
        const localJson = JSON.parse(rawData);
        
        if (Array.isArray(localJson) && localJson.length > 0) {
          const tickers = localJson
            .map((item: any) => item.symbol)
            .filter((s: any) => typeof s === 'string' && s.length > 0);
            
          if (tickers.length > 0) {
             return { source: 'LOCAL', tickers, raw: localJson };
          }
        }
      } else {
         console.warn(`[SP500] Local data file not found at ${localPath}`);
      }
    } catch (e) {
      console.warn(`[SP500] Local fallback error: ${(e as Error).message}`);
    }

    // 3. Ultimate Fallback (Hardcoded Safety Net)
    console.warn('[SP500] Fallback failed – returning minimal static universe');
    return {
      source: 'LOCAL',
      tickers: ['AAPL','MSFT','GOOGL','AMZN','NVDA','TSLA','META','JPM','NFLX','AMD']
    };
  }
}

export default new Sp500FallbackService();
EOF

# 4. Wire into TickerUniverseService
echo ">>> (3/4) Updating src/services/tickerUniverseService.ts..."
cat << 'EOF' > src/services/tickerUniverseService.ts
import fmpService from './fmpService.js';
import sp500FallbackService from './sp500FallbackService.js';
import axios from 'axios';

const FMP_KEY = process.env.FMP_API_KEY;
const FMP_BASE = 'https://financialmodelingprep.com/stable';

class TickerUniverseService {
  private cache: string[] = [];
  private lastUpdate: number = 0;
  private readonly CACHE_DURATION = 1000 * 60 * 60 * 12; // 12 hours

  async getUniverse(): Promise<string[]> {
    if (this.cache.length > 0 && Date.now() - this.lastUpdate < this.CACHE_DURATION) {
      return this.cache;
    }
    return await this.refreshUniverse();
  }

  public async refreshUniverse(): Promise<string[]> {
    console.log('[UNIVERSE] Refreshing dynamic universe...');
    
    // 1. Get S&P 500 Base (with fallback)
    try {
        const result = await sp500FallbackService.getSp500Universe();
        
        if (result.source === 'FMP') {
             console.log(`[UNIVERSE] Using FMP Stable SP500 constituents (count: ${result.tickers.length})...`);
        } else {
             console.warn(`[UNIVERSE] Using LOCAL SP500 static universe (count: ${result.tickers.length})...`);
        }
        
        // Populate initial cache with S&P 500
        this.cache = result.tickers;

    } catch (e: any) {
        console.error('[UNIVERSE] Exception in S&P fetch:', e.message);
    }

    // 2. Fetch Active Gainers (Momentum) - Legacy Pipeline Logic
    if (FMP_KEY) {
        try {
            const res = await axios.get(`${FMP_BASE}/stock_market/actives?apikey=${FMP_KEY}`);
            if (Array.isArray(res.data)) {
                res.data.forEach((s: any) => {
                    if(s.symbol && !this.cache.includes(s.symbol)) this.cache.push(s.symbol);
                });
            }
        } catch(e) {}

        // 3. Fetch Sector Performers via ETF Holdings - Legacy Pipeline Logic
        const etfs = ['ARKK', 'SMH', 'XBI', 'TAN', 'JETS'];
        for (const etf of etfs) {
            try {
                const res = await axios.get(`${FMP_BASE}/etf-holder/${etf}?apikey=${FMP_KEY}`);
                if (Array.isArray(res.data)) {
                    res.data.slice(0, 25).forEach((h: any) => {
                        if(h.asset && !this.cache.includes(h.asset)) this.cache.push(h.asset);
                    });
                }
                await new Promise(r => setTimeout(r, 100));
            } catch(e) {}
        }
    }

    this.lastUpdate = Date.now();
    console.log(`[UNIVERSE] Total Universe: ${this.cache.length} tickers loaded.`);
    
    // Fallback if everything failed (should be covered by sp500FallbackService but belt-and-suspenders)
    if (this.cache.length === 0) {
        this.cache = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'AMD', 'NFLX', 'JPM', 'DIS', 'V', 'MA'];
    }
    
    return this.cache;
  }

  public isValidTicker(ticker: string): boolean {
      if (!ticker) return false;
      if (this.cache.length === 0) return true;
      return this.cache.includes(ticker.toUpperCase());
  }

  // Required by pairsTradingService
  async getTopHoldings(etf: string) {
      return Array.from(this.cache).slice(0, 20);
  }

  // Required by masterIngestionService
  async getSectorTargets() {
      const all = await this.getExpandedUniverse();
      return {
          growth: all.slice(0, 50),
          safe: all.slice(50, 100),
          sectors: {
            energy: ['XOM', 'CVX'],
            industrial: ['CAT', 'DE'],
            defense: ['LMT', 'RTX']
          }
      };
  }
  
  async getExpandedUniverse() {
      return this.getUniverse();
  }
}

export default new TickerUniverseService();
EOF

# 5. Build and Verify
echo ">>> (4/4) Building..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ PHASE F3 COMPLETE. FALLBACK SYSTEM INSTALLED."
    echo "   Next: Verify 'SP500: ✅ Array[...]' in verification script."
else
    echo "❌ BUILD FAILED."
    exit 1
fi

# Run verification to check if FMP or Local is used
# NOTE: If FMP endpoint is truly 404/403, verifyFmpCore will still show 'SP500: ❌ EMPTY/NULL' 
# because it calls fmpService directly, NOT the new fallback service. 
# But the UNIVERSE logic is now safe.

echo ">>> Running standard FMP verification (Expect SP500 Fail if plan restricted, that's okay now)..."
node -r dotenv/config dist/scripts/verifyFmpCore.js
