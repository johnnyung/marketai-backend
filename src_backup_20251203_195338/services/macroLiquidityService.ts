import axios from 'axios';

const FRED_KEY = process.env.FRED_KEY;

interface LiquidityState {
    net_liquidity_billions: number;
    trend_4w: 'EXPANDING' | 'CONTRACTING' | 'NEUTRAL';
    regime: 'QE_LITE' | 'QT' | 'NEUTRAL';
    score_modifier: number;
    reason: string;
}

class MacroLiquidityService {

  async getLiquidityState(): Promise<LiquidityState> {
    console.log('      💧 Macro Liquidity: Measuring Global Flow...');
    
    if (!FRED_KEY) {
        return {
            net_liquidity_billions: 0,
            trend_4w: 'NEUTRAL',
            regime: 'NEUTRAL',
            score_modifier: 0,
            reason: "FRED Key Missing"
        };
    }

    try {
        // 1. Fetch Components (Last 5 weeks to calculate trend)
        // WALCL: Assets: Total Assets: Total Assets (Less Eliminations from Consolidation): Wednesday Level (Millions)
        // WTREGEN: Liabilities and Capital: Liabilities: Deposits with F.R. Banks, Other Than Reserve Balances: U.S. Treasury, General Account: Wednesday Level (Billions)
        // RRPONTSYD: Overnight Reverse Repurchase Agreements: Treasury Securities Sold by the Federal Reserve in the Temporary Open Market Operations (Billions)
        
        const [walcl, tga, rrp] = await Promise.all([
            this.fetchFredSeries('WALCL', 5),
            this.fetchFredSeries('WTREGEN', 5),
            this.fetchFredSeries('RRPONTSYD', 5)
        ]);

        if (!walcl.length || !tga.length || !rrp.length) {
            return { net_liquidity_billions: 0, trend_4w: 'NEUTRAL', regime: 'NEUTRAL', score_modifier: 0, reason: "Incomplete FRED Data" };
        }

        // 2. Calculate Net Liquidity for current and 4 weeks ago
        // Formula: Net Liq = Fed Balance Sheet - TGA - Reverse Repo
        const currentLiq = walcl[0] - tga[0] - rrp[0];
        const pastLiq = walcl[walcl.length-1] - tga[tga.length-1] - rrp[rrp.length-1];
        
        // 3. Determine Trend
        const change = currentLiq - pastLiq; // Billions change over 4 weeks
        
        // 4. Define Regime
        let regime: 'QE_LITE' | 'QT' | 'NEUTRAL' = 'NEUTRAL';
        let modifier = 0;
        let trendDesc = "Stable";

        if (change > 50) { // +$50B expansion
            regime = 'QE_LITE';
            modifier = 10;
            trendDesc = "Aggressive Expansion";
        } else if (change > 10) {
            regime = 'NEUTRAL';
            modifier = 5;
            trendDesc = "Mild Expansion";
        } else if (change < -50) { // -$50B contraction
            regime = 'QT';
            modifier = -15; // Liquidity drain hurts more than expansion helps
            trendDesc = "Aggressive Contraction";
        } else if (change < -10) {
            regime = 'NEUTRAL';
            modifier = -5;
            trendDesc = "Mild Contraction";
        }

        const reason = `Net Liquidity $${currentLiq.toFixed(0)}B. Trend: ${trendDesc} (${change > 0 ? '+' : ''}${change.toFixed(0)}B / 4w).`;
        console.log(`      -> ${reason}`);

        return {
            net_liquidity_billions: currentLiq,
            trend_4w: change > 0 ? 'EXPANDING' : 'CONTRACTING',
            regime,
            score_modifier: modifier,
            reason
        };

    } catch (e: any) {
        console.error("Liquidity Check Error:", e.message);
        return { net_liquidity_billions: 0, trend_4w: 'NEUTRAL', regime: 'NEUTRAL', score_modifier: 0, reason: "Analysis Error" };
    }
  }

  private async fetchFredSeries(seriesId: string, observations: number): Promise<number[]> {
    try {
        const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_KEY}&file_type=json&limit=${observations}&sort_order=desc`;
        const res = await axios.get(url, { timeout: 5000 });
        const data = res.data.observations;
        
        if (!data || data.length === 0) return [];

        return data.map((d: any) => {
            let val = parseFloat(d.value);
            // Normalize to Billions
            if (seriesId === 'WALCL') val = val / 1000; // WALCL is Millions, others are Billions
            return val;
        });
    } catch (e) {
        return [];
    }
  }
}

export default new MacroLiquidityService();
