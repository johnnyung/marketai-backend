import fmpService from './fmpService.js';

interface OFISignal {
    score: number; // -100 to 100
    net_premium: number; // Positive = Bullish
    put_call_premium_ratio: number;
    flow_sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    burst_detected: boolean;
    details: string[];
}

class OptionsFlowIntelligenceEngine {

  /**
   * Aggregates the entire option chain to find the "River Current".
   */
  async analyze(ticker: string): Promise<OFISignal> {
    try {
        const chain = await fmpService.getOptionChain(ticker);
        
        if (!chain || chain.length === 0) return this.getFallback();

        let totalCallPrem = 0;
        let totalPutPrem = 0;
        let totalVol = 0;
        let totalOI = 0;

        // Iterate entire chain (front month focus usually better, but aggregate gives macro view)
        chain.forEach((c: any) => {
            const vol = c.volume || 0;
            const price = c.lastPrice || 0;
            const premium = vol * price * 100;
            const oi = c.openInterest || 0;

            totalVol += vol;
            totalOI += oi;

            // Heuristic: If API doesn't specify type, guess by symbol (C/P)
            const isCall = c.type === 'CALL' || (c.contractSymbol && c.contractSymbol.includes('C' + c.strike));
            
            if (isCall) {
                totalCallPrem += premium;
            } else {
                totalPutPrem += premium;
            }
        });

        // Metrics
        const netPremium = totalCallPrem - totalPutPrem;
        const premiumRatio = totalCallPrem > 0 ? totalPutPrem / totalCallPrem : 1.0;
        
        // Burst Detection: Is volume unusually high relative to OI?
        // (Rough proxy for "Sustained Burst" without time-series DB)
        const turnover = totalOI > 0 ? totalVol / totalOI : 0;
        const burst = turnover > 0.10; // >10% of OI traded today is significant

        // Scoring
        let score = 50;
        let sentiment: OFISignal['flow_sentiment'] = 'NEUTRAL';
        const details: string[] = [];

        if (premiumRatio < 0.7) {
            score += 20;
            sentiment = 'BULLISH';
            details.push(`Bullish Premium Flow ($${(netPremium/1_000_000).toFixed(1)}M Net)`);
        } else if (premiumRatio > 1.3) {
            score -= 20;
            sentiment = 'BEARISH';
            details.push(`Bearish Premium Flow (-$${(Math.abs(netPremium)/1_000_000).toFixed(1)}M Net)`);
        }

        if (burst) {
            details.push('High Option Turnover (Burst Detected)');
            // Burst amplifies the sentiment
            if (sentiment === 'BULLISH') score += 10;
            if (sentiment === 'BEARISH') score -= 10;
        }

        return {
            score: Math.max(0, Math.min(100, score)),
            net_premium: netPremium,
            put_call_premium_ratio: parseFloat(premiumRatio.toFixed(2)),
            flow_sentiment: sentiment,
            burst_detected: burst,
            details
        };

    } catch (e) {
        console.error(`OFI Error for ${ticker}:`, e);
        return this.getFallback();
    }
  }

  private getFallback(): OFISignal {
      return {
          score: 50,
          net_premium: 0,
          put_call_premium_ratio: 1.0,
          flow_sentiment: 'NEUTRAL',
          burst_detected: false,
          details: []
      };
  }
}

export default new OptionsFlowIntelligenceEngine();
