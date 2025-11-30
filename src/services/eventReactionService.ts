import fmpService from './fmpService.js';
import marketDataService from './marketDataService.js';

interface ReactionProfile {
  ticker: string;
  reaction_type: 'FLASH' | 'INTRADAY' | 'MULTI_DAY_DRIFT';
  estimated_lag_minutes: number;
  beta_sensitivity: number;
  volume_profile: string;
  execution_strategy: string;
}

class EventReactionService {

  async analyzeReactionProfile(ticker: string): Promise<ReactionProfile> {
    // Default profile
    const result: ReactionProfile = {
        ticker,
        reaction_type: 'INTRADAY',
        estimated_lag_minutes: 60,
        beta_sensitivity: 1.0,
        volume_profile: 'Normal',
        execution_strategy: 'Limit Order'
    };

    try {
        // 1. Fetch Profile for Beta & Volume
        const profile = await fmpService.getCompanyProfile(ticker);
        const quote = await marketDataService.getStockPrice(ticker);
        
        if (!profile || !quote) return result;

        const beta = parseFloat(profile.beta || '1.0');
        const avgVol = profile.volAvg || 1000000;
        const currentVol = quote.volume || 0;
        
        result.beta_sensitivity = beta;

        // 2. Determine Reaction Type based on Volatility/Liquidity characteristics
        
        // SCENARIO A: FLASH REACTOR (High Beta, High Liquidity, Algo Dominated)
        // Examples: NVDA, TSLA, COIN
        if (beta > 1.5 && avgVol > 5000000) {
            result.reaction_type = 'FLASH';
            result.estimated_lag_minutes = 5; // Moves instantly
            result.execution_strategy = 'IMMEDIATE ENTRY (Don\'t Chase)';
            result.volume_profile = 'High Frequency';
        }
        
        // SCENARIO B: INSTITUTIONAL DRIFT (Low Beta, Huge Float)
        // Examples: KO, JNJ, WMT
        else if (beta < 0.8) {
            result.reaction_type = 'MULTI_DAY_DRIFT';
            result.estimated_lag_minutes = 24 * 60; // Takes days to absorb news
            result.execution_strategy = 'ACCUMULATE (VWAP)';
            result.volume_profile = 'Institutional Flow';
        }
        
        // SCENARIO C: INTRADAY TRENDER (Mid Beta)
        else {
            result.reaction_type = 'INTRADAY';
            result.estimated_lag_minutes = 60; // Hourly trends
            result.execution_strategy = 'WAIT FOR PULLBACK';
            result.volume_profile = 'Retail/Mixed';
        }

        // 3. Volume Spike Adjustment
        // If current volume is massive relative to average, everything speeds up
        const volRatio = currentVol / avgVol;
        if (volRatio > 3.0) {
            result.reaction_type = 'FLASH'; // Forced into flash mode by volume shock
            result.execution_strategy = 'MOMENTUM BREAKOUT';
            result.estimated_lag_minutes = 1;
        }

        return result;

    } catch (e) {
        console.error(`Reaction Profile Error for ${ticker}`, e);
        return result;
    }
  }
}

export default new EventReactionService();
