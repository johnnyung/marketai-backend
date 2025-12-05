import pool from '../db/index.js';
import marketDataService from './marketDataService.js';
import predictionLoggerService from './predictionLoggerService.js';
import { TechnicalMath } from '../utils/mathUtils.js';

class PredictionReviewService {

  /**
   * Main entry point: Reviews all pending predictions
   */
  async runReviewCycle() {
    console.log('   ⚖️  The Magistrate: Reviewing Prediction Outcomes...');
    
    try {
      // 1. Load Unresolved Predictions
      const pending = await predictionLoggerService.getPendingPredictions();
      console.log(`      -> Found ${pending.length} pending predictions.`);
      
      let processed = 0;
      
      for (const pred of pending) {
        await this.evaluatePrediction(pred);
        processed++;
        // Rate limit
        await new Promise(r => setTimeout(r, 500));
      }
      
      return { processed, success: true };
      
    } catch (e: any) {
      console.error('      ❌ Review Cycle Error:', e.message);
      return { processed: 0, success: false, error: e.message };
    }
  }

  /**
   * Evaluate a single prediction
   */
  private async evaluatePrediction(pred: any) {
    try {
      // 1. Get Current Price & High/Low since prediction
      // For MVP, we check current price. In Phase 3, we will check intraday highs/lows history.
      const quote = await marketDataService.getStockPrice(pred.ticker);
      
      if (!quote) {
        // console.warn(`      ⚠️  No price data for ${pred.ticker}`);
        return;
      }

      const currentPrice = quote.price;
      const entryPrice = parseFloat(pred.entry_primary);
      const stopLoss = parseFloat(pred.stop_loss);
      const tp1 = parseFloat(pred.take_profit_1);
      const tp2 = parseFloat(pred.take_profit_2);
      const tp3 = parseFloat(pred.take_profit_3);
      
      // 2. Calculate Metrics
      const pnl = currentPrice - entryPrice;
      const pnlPct = (pnl / entryPrice) * 100;
      
      // Calculate Excursion (Simplified: using current price as proxy for now)
      // In production, we would query historical bars between pred.date_predicted and NOW()
      // to find true High/Low. For now, we use current price snapshots.
      
      const daysHeld = (Date.now() - new Date(pred.date_predicted).getTime()) / (1000 * 60 * 60 * 24);
      
      // 3. Determine Outcome
      let outcome: 'WIN' | 'LOSS' | 'NEUTRAL' | 'PENDING' = 'PENDING';
      let hitTp1 = false;
      let hitSl = false;

      // Check Stop Loss (Assuming Long position for now)
      if (currentPrice <= stopLoss) {
          outcome = 'LOSS';
          hitSl = true;
      }
      // Check Take Profit
      else if (currentPrice >= tp1) {
          outcome = 'WIN';
          hitTp1 = true;
      }
      // Check Time Expiry (If held > 14 days and nowhere near target)
      else if (daysHeld > 14) {
          outcome = pnl > 0 ? 'WIN' : 'NEUTRAL'; // Soft win or scratch
      }

      // 4. Update Record if Outcome Decided
      if (outcome !== 'PENDING') {
          await predictionLoggerService.saveOutcome({
              id: pred.id,
              outcome,
              pnl: parseFloat(pnlPct.toFixed(2)),
              days_held: parseFloat(daysHeld.toFixed(1)),
              mfe: parseFloat(pnlPct.toFixed(2)), // Placeholder until OHLC scan
              mae: parseFloat(pnlPct.toFixed(2)), // Placeholder until OHLC scan
              hit_tp1: hitTp1,
              hit_sl: hitSl
          });
          console.log(`      📝 Graded ${pred.ticker}: ${outcome} (${pnlPct.toFixed(2)}%)`);
      }

    } catch (e: any) {
      console.error(`      ❌ Failed to grade ${pred.ticker}:`, e.message);
    }
  }
}

export default new PredictionReviewService();
