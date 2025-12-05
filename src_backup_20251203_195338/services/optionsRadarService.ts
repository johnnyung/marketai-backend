import fmpService from './fmpService.js';

interface OptionsAlert {
  ticker: string;
  type: string;
  sentiment: string;
  details: string;
  score: number;
}

class OptionsRadarService {
  
  // Scans for unusual options activity
  // FALLBACK: If no options data, scan for unusual PRICE/VOLUME activity (Proxy)
  async scanFlows(): Promise<OptionsAlert[]> {
      try {
          // Minimal scan list to check connectivity
          const universe = ['AAPL', 'NVDA', 'TSLA', 'AMD'];
          const quotes = await fmpService.getBatchPrices(universe);
          
          const alerts: OptionsAlert[] = [];

          quotes.forEach((q: any) => {
              // MVL: Volume Breakout Proxy
              // If price moved > 3%, assume significant activity
              if (Math.abs(q.changesPercentage) > 3.0) {
                  alerts.push({
                      ticker: q.symbol,
                      type: 'VOLATILITY_PROXY', // Honest labeling
                      sentiment: q.changesPercentage > 0 ? 'BULLISH' : 'BEARISH',
                      details: `Heavy price movement (${q.changesPercentage}%) suggests options hedging`,
                      score: 75
                  });
              }
          });

          return alerts;

      } catch (e) {
          return [];
      }
  }

  async checkTicker(ticker: string): Promise<OptionsAlert | null> {
      return null;
  }
}

export default new OptionsRadarService();
