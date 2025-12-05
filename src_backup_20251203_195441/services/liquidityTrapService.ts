import fmpService from './fmpService.js';

interface LiquidityCheck {
  ticker: string;
  passed: boolean;
  reason: string;
  metrics: {
    marketCap: number;
    avgVolume: number;
    price: number;
  }
}

class LiquidityTrapService {
  
  // Thresholds
  private MIN_MARKET_CAP = 300_000_000; // $300M
  private MIN_AVG_VOLUME = 500_000;     // 500k shares
  private MIN_PRICE = 2.00;             // $2.00
  private MIN_DOLLAR_VOL = 5_000_000;   // $5M daily turnover

  async screen(ticker: string, tier: string): Promise<LiquidityCheck> {
    // Skip strict checks for Crypto (different liquidity profile)
    if (tier === 'crypto_alpha' || ticker.includes('-USD') || ticker.includes('USD')) {
        return {
            ticker, passed: true, reason: "Crypto Asset (Skipped)",
            metrics: { marketCap: 0, avgVolume: 0, price: 0 }
        };
    }

    try {
        const profile = await fmpService.getCompanyProfile(ticker);
        
        // If data is missing, fail safe (don't trade unknowns)
        if (!profile) {
             return { 
                ticker, passed: false, reason: "Data Unavailable", 
                metrics: { marketCap: 0, avgVolume: 0, price: 0 } 
            };
        }

        const mktCap = profile.mktCap || 0;
        const avgVol = profile.volAvg || 0;
        const price = profile.price || 0;
        const dollarVol = price * avgVol;

        // 1. Market Cap Check
        if (mktCap < this.MIN_MARKET_CAP) {
            return {
                ticker, passed: false,
                reason: `Microcap Risk ($${(mktCap/1e6).toFixed(1)}M < $300M)`,
                metrics: { marketCap: mktCap, avgVolume: avgVol, price }
            };
        }

        // 2. Price Floor Check
        if (price < this.MIN_PRICE) {
            return {
                ticker, passed: false,
                reason: `Penny Stock Risk ($${price} < $2.00)`,
                metrics: { marketCap: mktCap, avgVolume: avgVol, price }
            };
        }

        // 3. Volume Check
        if (avgVol < this.MIN_AVG_VOLUME) {
            return {
                ticker, passed: false,
                reason: `Illiquid (Vol ${avgVol.toLocaleString()} < 500k)`,
                metrics: { marketCap: mktCap, avgVolume: avgVol, price }
            };
        }

        // 4. Dollar Volume Check (Institutional Relevance)
        if (dollarVol < this.MIN_DOLLAR_VOL) {
             return {
                ticker, passed: false,
                reason: `Low Dollar Vol ($${(dollarVol/1e6).toFixed(1)}M < $5M)`,
                metrics: { marketCap: mktCap, avgVolume: avgVol, price }
            };
        }

        return {
            ticker, passed: true, reason: "Liquidity Verified",
            metrics: { marketCap: mktCap, avgVolume: avgVol, price }
        };

    } catch (e) {
        return { 
            ticker, passed: false, reason: "Screening Error", 
            metrics: { marketCap: 0, avgVolume: 0, price: 0 } 
        };
    }
  }
}

export default new LiquidityTrapService();
