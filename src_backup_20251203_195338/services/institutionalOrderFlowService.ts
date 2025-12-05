import fmpService from './fmpService.js';

interface OrderFlowSignal {
    score: number; // -100 to 100
    pressure: 'ACCUMULATION' | 'DISTRIBUTION' | 'NEUTRAL';
    metrics: {
        net_flow_millions: number;
        block_trade_count: number;
        dark_pool_prints: number;
        relative_volume: number;
    };
    details: string[];
}

class InstitutionalOrderFlowService {

  /**
   * Analyzes intraday data to find institutional footprints.
   */
  async analyze(ticker: string): Promise<OrderFlowSignal> {
    try {
        // 1. Fetch Intraday Data (5min candles gives a good balance of granularity)
        const candles = await fmpService.getIntraday(ticker, '5min');
        
        if (!candles || candles.length < 50) return this.getFallback();

        // 2. Calculate Baseline Volume (Moving Average of last 50 periods)
        // Note: FMP returns newest first usually
        const recent = candles.slice(0, 78); // Approx 1 trading day (6.5 hrs / 5 min = 78)
        const volumeSum = recent.reduce((acc: number, c: any) => acc + c.volume, 0);
        const avgVol = volumeSum / recent.length;

        // 3. Analyze Flow
        let buyVol = 0;
        let sellVol = 0;
        let blockTrades = 0;
        let darkPoolPrints = 0;
        let details: string[] = [];

        // We iterate backwards (oldest to newest in this slice logic if reversed, but standard loop is fine)
        // Let's assume index 0 is newest.
        
        recent.forEach((candle: any) => {
            const price = candle.close;
            const open = candle.open;
            const vol = candle.volume;
            const rangePct = Math.abs((price - open) / open);

            // A. Block Trade Detection (3x Avg Volume)
            if (vol > avgVol * 3.0) {
                blockTrades++;
                
                // B. Dark Pool Proxy (Huge Vol, Tiny Range < 0.05%)
                if (rangePct < 0.0005) {
                    darkPoolPrints++;
                    // Dark pool prints are often neutral but signify interest.
                    // We assign them to the direction of the close vs open slightly
                }
            }

            // C. Flow Direction (Uptick vs Downtick logic)
            if (price >= open) {
                buyVol += (vol * price);
            } else {
                sellVol += (vol * price);
            }
        });

        // 4. Calculate Metrics
        const netFlow = buyVol - sellVol;
        const totalFlow = buyVol + sellVol;
        const flowRatio = totalFlow > 0 ? buyVol / totalFlow : 0.5;
        const netFlowMillions = netFlow / 1_000_000;

        // 5. Scoring & Pressure
        let score = 50;
        let pressure: OrderFlowSignal['pressure'] = 'NEUTRAL';

        if (flowRatio > 0.60) {
            score += 20;
            pressure = 'ACCUMULATION';
            details.push(`Strong Net Buy Flow ($${netFlowMillions.toFixed(1)}M)`);
        } else if (flowRatio < 0.40) {
            score -= 20;
            pressure = 'DISTRIBUTION';
            details.push(`Net Sell Pressure (-$${Math.abs(netFlowMillions).toFixed(1)}M)`);
        }

        if (blockTrades > 5) {
            details.push(`${blockTrades} Block Trades Detected`);
            // Blocks often support the trend
            if (pressure === 'ACCUMULATION') score += 10;
            if (pressure === 'DISTRIBUTION') score -= 10;
        }

        if (darkPoolPrints > 2) {
            details.push(`${darkPoolPrints} Dark Pool/Signature Prints`);
        }

        return {
            score: Math.max(0, Math.min(100, score)),
            pressure,
            metrics: {
                net_flow_millions: parseFloat(netFlowMillions.toFixed(2)),
                block_trade_count: blockTrades,
                dark_pool_prints: darkPoolPrints,
                relative_volume: parseFloat((avgVol > 0 ? recent[0].volume / avgVol : 1).toFixed(2))
            },
            details
        };

    } catch (e) {
        console.error(`IOF Error for ${ticker}:`, e);
        return this.getFallback();
    }
  }

  private getFallback(): OrderFlowSignal {
      return {
          score: 50,
          pressure: 'NEUTRAL',
          metrics: {
              net_flow_millions: 0,
              block_trade_count: 0,
              dark_pool_prints: 0,
              relative_volume: 1.0
          },
          details: []
      };
  }
}

export default new InstitutionalOrderFlowService();
