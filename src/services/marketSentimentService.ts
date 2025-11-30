import marketDataService from './marketDataService.js';
import fmpService from './fmpService.js';
import { TechnicalMath } from '../utils/mathUtils.js';

interface SentimentProfile {
  score: number; // 0-100 (0=Extreme Fear, 100=Extreme Greed)
  regime: 'EXTREME_FEAR' | 'FEAR' | 'NEUTRAL' | 'GREED' | 'EXTREME_GREED';
  vix_structure: 'CONTANGO' | 'BACKWARDATION'; // Backwardation = Panic
  metrics: {
    vix: number;
    put_call_ratio: number;
    market_momentum: number;
    safe_haven_demand: number; // Bond/Gold strength
  };
  contrarian_signal: 'BUY_THE_FEAR' | 'SELL_THE_GREED' | 'FOLLOW_TREND';
  reason: string;
}

class MarketSentimentService {

  async getThermometer(): Promise<SentimentProfile> {
    // console.log(`      🌡️  Sentiment: Taking Market Temperature...`);

    try {
        // 1. GATHER DATA
        // Use SPY as market proxy, VIX for fear, HYG for credit risk, TLT for safe haven
        const quotes = await marketDataService.getMultiplePrices(['SPY', 'VIX', 'HYG', 'TLT']);
        
        const spy = quotes.get('SPY');
        const vix = quotes.get('VIX');
        const hyg = quotes.get('HYG'); // Junk Bonds
        const tlt = quotes.get('TLT'); // Treasuries

        if (!spy || !vix) {
             return this.fallbackProfile("Data Missing");
        }

        // 2. COMPUTE COMPONENTS
        
        // A. VIX Score (Inverse)
        // VIX > 30 = Extreme Fear (0), VIX < 12 = Extreme Greed (100)
        // Normalize: 30 -> 0, 12 -> 100
        let vixScore = 0;
        if (vix.price >= 30) vixScore = 5;
        else if (vix.price <= 12) vixScore = 95;
        else {
            // Linear interpolation between 12 and 30
            vixScore = 100 - ((vix.price - 12) / (30 - 12) * 100);
        }

        // B. Market Momentum (SPY vs SMA125 - Simplified as recent trend)
        // If SPY is positive, greedier.
        const momScore = spy.changePercent > 0 ? 60 : 40; // Rudimentary

        // C. Safe Haven Demand (Risk On/Off)
        // If HYG (Junk) is up and TLT (Safe) is down -> Greed
        // If HYG is down and TLT is up -> Fear
        let riskScore = 50;
        if (hyg && tlt) {
            const riskOn = hyg.changePercent - tlt.changePercent;
            riskScore = 50 + (riskOn * 10); // Swing based on spread
        }

        // D. Put/Call Ratio (Simulated proxy if real data missing)
        // In V1, we infer from VIX/SPY correlation, or use FMP if available.
        // Assuming standard inverse correlation for now.
        const pcrScore = vixScore; // Proxy

        // 3. AGGREGATE
        let totalScore = (vixScore * 0.4) + (momScore * 0.3) + (riskScore * 0.3);
        totalScore = Math.max(0, Math.min(100, totalScore));

        // 4. DEFINE REGIME
        let regime: SentimentProfile['regime'] = 'NEUTRAL';
        if (totalScore < 20) regime = 'EXTREME_FEAR';
        else if (totalScore < 40) regime = 'FEAR';
        else if (totalScore > 80) regime = 'EXTREME_GREED';
        else if (totalScore > 60) regime = 'GREED';

        // 5. VIX STRUCTURE (Heuristic: High VIX usually means Backwardation risk)
        const vixStructure = vix.price > 25 ? 'BACKWARDATION' : 'CONTANGO';

        // 6. CONTRARIAN SIGNAL
        let signal: SentimentProfile['contrarian_signal'] = 'FOLLOW_TREND';
        let reason = "Market in equilibrium.";

        if (regime === 'EXTREME_FEAR') {
            signal = 'BUY_THE_FEAR';
            reason = `Panic selling detected (Score ${totalScore.toFixed(0)}). Risk/Reward favors Longs.`;
        } else if (regime === 'EXTREME_GREED') {
            signal = 'SELL_THE_GREED';
            reason = `Euphoria detected (Score ${totalScore.toFixed(0)}). Risk/Reward favors Shorts/Cash.`;
        }

        return {
            score: Math.round(totalScore),
            regime,
            vix_structure: vixStructure,
            metrics: {
                vix: vix.price,
                put_call_ratio: 1.0 - ((totalScore-50)/100), // Synthetic display value
                market_momentum: momScore,
                safe_haven_demand: riskScore
            },
            contrarian_signal: signal,
            reason
        };

    } catch (e: any) {
        return this.fallbackProfile(`Error: ${e.message}`);
    }
  }

  private fallbackProfile(reason: string): SentimentProfile {
      return {
          score: 50, regime: 'NEUTRAL', vix_structure: 'CONTANGO',
          metrics: { vix: 15, put_call_ratio: 1, market_momentum: 50, safe_haven_demand: 50 },
          contrarian_signal: 'FOLLOW_TREND', reason
      };
  }
}

export default new MarketSentimentService();
