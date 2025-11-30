import marketDataService from './marketDataService.js';

interface ArbitrageSignal {
  driver: string;
  target: string;
  divergence_pct: number;
  correlation: number;
  signal: 'CATCH_UP_BUY' | 'CATCH_UP_SELL' | 'DIVERGENCE_WARNING' | 'NONE';
  confidence: number;
  reason: string;
}

const ARBITRAGE_PAIRS = [
    // Crypto Proxies
    { driver: 'BTC-USD', target: 'MSTR', correlation: 0.95, lag_threshold: 2.0 },
    { driver: 'BTC-USD', target: 'COIN', correlation: 0.85, lag_threshold: 2.5 },
    { driver: 'BTC-USD', target: 'MARA', correlation: 0.80, lag_threshold: 3.0 },
    
    // Commodities
    { driver: 'GLD', target: 'NEM', correlation: 0.75, lag_threshold: 1.5 }, // Gold -> Newmont
    { driver: 'USO', target: 'XLE', correlation: 0.80, lag_threshold: 1.5 }, // Oil -> Energy ETF
    { driver: 'USO', target: 'OXY', correlation: 0.70, lag_threshold: 2.0 },
    
    // Tech / Semi
    { driver: 'NVDA', target: 'SMH', correlation: 0.90, lag_threshold: 1.5 },
    { driver: 'NVDA', target: 'AMD', correlation: 0.65, lag_threshold: 2.5 }
];

class MultiMarketArbitrageService {

  async scanDivergences(): Promise<ArbitrageSignal[]> {
    const signals: ArbitrageSignal[] = [];
    
    // 1. Get Unique Tickers
    const allTickers = new Set<string>();
    ARBITRAGE_PAIRS.forEach(p => { allTickers.add(p.driver); allTickers.add(p.target); });
    
    // 2. Batch Fetch Prices
    const quotes = await marketDataService.getMultiplePrices(Array.from(allTickers));

    // 3. Analyze Pairs
    for (const pair of ARBITRAGE_PAIRS) {
        const driverQ = quotes.get(pair.driver);
        const targetQ = quotes.get(pair.target);

        if (!driverQ || !targetQ) continue;

        const driverMove = driverQ.changePercent;
        const targetMove = targetQ.changePercent;
        const divergence = driverMove - targetMove;

        // SCENARIO A: Driver Rips, Target Lags (Catch-up Buy)
        if (driverMove > 2.0 && divergence > pair.lag_threshold) {
            signals.push({
                driver: pair.driver,
                target: pair.target,
                divergence_pct: parseFloat(divergence.toFixed(2)),
                correlation: pair.correlation,
                signal: 'CATCH_UP_BUY',
                confidence: 85,
                reason: `ARBITRAGE: ${pair.driver} surged +${driverMove.toFixed(1)}% but ${pair.target} only +${targetMove.toFixed(1)}%. Gap: ${divergence.toFixed(1)}%. Expect Catch-up.`
            });
        }
        
        // SCENARIO B: Driver Dumps, Target Holds (Bear Trap / Catch-up Sell)
        else if (driverMove < -2.0 && divergence < -pair.lag_threshold) {
             signals.push({
                driver: pair.driver,
                target: pair.target,
                divergence_pct: parseFloat(divergence.toFixed(2)),
                correlation: pair.correlation,
                signal: 'CATCH_UP_SELL',
                confidence: 85,
                reason: `ARBITRAGE: ${pair.driver} dumped ${driverMove.toFixed(1)}% but ${pair.target} is holding up. Gap: ${Math.abs(divergence).toFixed(1)}%. Downside risk high.`
            });
        }
    }

    return signals;
  }
}

export default new MultiMarketArbitrageService();
