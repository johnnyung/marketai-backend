import { pool } from '../db/index.js';

export interface PredictionLogInput {
  ticker: string;
  confidence: number;
  entry_primary: number;
  stop_loss: number;
  take_profit_1: number;
  take_profit_2: number;
  take_profit_3: number;
  agent_signals: any; // Snapshot of Deep Brain Decision Matrix
}

export interface OutcomeUpdate {
  id: number;
  outcome: 'WIN' | 'LOSS' | 'NEUTRAL';
  pnl: number;
  days_held: number;
  mfe?: number; // Max Favorable Excursion
  mae?: number; // Max Adverse Excursion
  hit_tp1?: boolean;
  hit_sl?: boolean;
}

class PredictionLoggerService {

  /**
   * Logs a fresh prediction from the Daily Picks engine.
   */
  async logPrediction(data: PredictionLogInput): Promise<number | null> {
    try {
      const res = await pool.query(`
        INSERT INTO prediction_results (
          ticker, confidence_at_prediction,
          entry_primary, stop_loss,
          take_profit_1, take_profit_2, take_profit_3,
          agent_signals, result_outcome, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING', NOW())
        RETURNING id
      `, [
        data.ticker, data.confidence,
        data.entry_primary, data.stop_loss,
        data.take_profit_1, data.take_profit_2, data.take_profit_3,
        JSON.stringify(data.agent_signals)
      ]);
      
      console.log(`      📝 POT: Logged prediction for ${data.ticker} (ID: ${res.rows[0].id})`);
      return res.rows[0].id;

    } catch (e: any) {
      console.error(`      ❌ POT Log Error: ${e.message}`);
      return null;
    }
  }

  /**
   * Retrieves pending predictions for the Magistrate to review/grade.
   */
  async getPendingPredictions() {
    try {
      const res = await pool.query(`
        SELECT * FROM prediction_results
        WHERE result_outcome = 'PENDING'
        ORDER BY date_predicted ASC
      `);
      return res.rows;
    } catch (e) { return []; }
  }

  /**
   * Saves the final outcome of a trade.
   */
  async saveOutcome(data: OutcomeUpdate) {
    try {
      await pool.query(`
        UPDATE prediction_results
        SET
          result_outcome = $1,
          performance_pnl = $2,
          time_to_outcome_days = $3,
          max_favorable_excursion = $4,
          max_adverse_excursion = $5,
          hit_take_profit_1 = $6,
          hit_stop_loss = $7,
          updated_at = NOW()
        WHERE id = $8
      `, [
        data.outcome, data.pnl, data.days_held,
        data.mfe || 0, data.mae || 0,
        data.hit_tp1 || false, data.hit_sl || false,
        data.id
      ]);
      console.log(`      📝 POT: Updated outcome for ID ${data.id}: ${data.outcome}`);
    } catch (e: any) {
      console.error(`      ❌ POT Update Error: ${e.message}`);
    }
  }
}

export default new PredictionLoggerService();
