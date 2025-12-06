import marketDataService from './marketDataService.js';
import { pool } from '../db/index.js';

interface SpilloverSignal {
  driver: string;
  target: string;
  divergence: number; // % gap
  confidence: number;
  reason: string;
}

class ReverseCorrelationService {

  // Runs at market close (or during updates)
  async analyzeSpillover(): Promise<SpilloverSignal[]> {
    console.log('      ⇄ Reverse Correlation: Checking Equity Spillover...');
    const signals: SpilloverSignal[] = [];

    try {
      // 1. Get Active Reverse Patterns
      const patterns = await pool.query(`
          SELECT driver_asset, target_asset, correlation_coefficient
          FROM correlation_patterns
          WHERE pattern_type = 'equity_spillover'
      `);

      // 2. Collect unique assets needed
      const drivers = [...new Set(patterns.rows.map(r => r.driver_asset))];
      const targets = [...new Set(patterns.rows.map(r => r.target_asset))];
      
      // 3. Fetch Prices
      const driverQuotes = await marketDataService.getMultiplePrices(drivers);
      // For crypto targets, we need to ensure we get the USD pair
      const targetQuotes = await marketDataService.getMultiplePrices(targets.map(t => t + '-USD'));

      // 4. Analyze Divergence
      for (const p of patterns.rows) {
          const dQuote = driverQuotes.get(p.driver_asset);
          
          // Handle Crypto ticker mapping (BTC vs BTC-USD)
          let tTicker = p.target_asset;
          if (!targetQuotes.has(tTicker)) tTicker = p.target_asset + '-USD';
          const tQuote = targetQuotes.get(tTicker);

          if (dQuote && tQuote) {
              // Logic: If Driver moved significantly (>1.5%) and Target lagged
              const dMove = dQuote.changePercent; // e.g. +2.5%
              const tMove = tQuote.changePercent; // e.g. +0.5%
              
              const gap = dMove - tMove;

              // Threshold: 1.5% Divergence in the "correlated" direction
              if (dMove > 1.5 && gap > 1.0) {
                  // Bullish Spillover (Stocks ripped, Crypto lagging)
                  signals.push({
                      driver: p.driver_asset,
                      target: p.target_asset,
                      divergence: parseFloat(gap.toFixed(2)),
                      confidence: Math.min(95, 70 + (gap * 5)),
                      reason: `SPILLOVER: ${p.driver_asset} rallied +${dMove.toFixed(2)}%. ${p.target_asset} lagging at +${tMove.toFixed(2)}%. Catch-up expected.`
                  });
                  console.log(`      -> 🚀 DETECTED: ${p.driver_asset} leading ${p.target_asset} (Gap: ${gap.toFixed(2)}%)`);
              }
              else if (dMove < -1.5 && gap < -1.0) {
                   // Bearish Spillover (Stocks dumped, Crypto floating)
                   signals.push({
                      driver: p.driver_asset,
                      target: p.target_asset,
                      divergence: parseFloat(gap.toFixed(2)),
                      confidence: Math.min(95, 70 + (Math.abs(gap) * 5)),
                      reason: `SPILLOVER DROP: ${p.driver_asset} dumped ${dMove.toFixed(2)}%. ${p.target_asset} floating. Downside catch-up risk.`
                   });
              }
          }
      }

      return signals;

    } catch (e) {
      console.error("Reverse Correlation Error:", e);
      return [];
    }
  }
}

export default new ReverseCorrelationService();
