import { pool } from '../db/index.js';

class ConfidenceLedgerService {
  
  // 1. ADJUST: Apply historical truth to current optimism
  async adjustConfidence(ticker: string, sector: string, rawScore: number): Promise<{ adjusted: number, reason: string }> {
    try {
        const bucket = this.getBucket(rawScore);
        // Fallback to 'General' if sector specific data is missing
        const cal = await pool.query(`
            SELECT adjustment_factor, actual_win_rate
            FROM confidence_calibration
            WHERE sector = $1 AND confidence_bucket = $2
        `, [sector || 'General', bucket]);

        if (cal.rows.length > 0) {
            const factor = parseFloat(cal.rows[0].adjustment_factor);
            const winRate = parseFloat(cal.rows[0].actual_win_rate);
            const adjusted = Math.round(rawScore * factor);
            
            if (factor < 0.98) {
                return {
                    adjusted,
                    reason: `[CONFIDENCE LEDGER] System is historically overconfident on ${bucket} ${sector} picks (Real Win Rate: ${winRate.toFixed(1)}%). Score dampened.`
                };
            } else if (factor > 1.02) {
                 return {
                    adjusted,
                    reason: `[CONFIDENCE LEDGER] System underestimates ${bucket} ${sector} picks (Real Win Rate: ${winRate.toFixed(1)}%). Score boosted.`
                };
            }
        }
    } catch (e) { console.error("Ledger Adjustment Error", e); }
    
    return { adjusted: rawScore, reason: "" };
  }

  // 2. LOG: Record the bet
  async logEntry(ticker: string, sector: string, initial: number, adjusted: number) {
    try {
        await pool.query(`
            INSERT INTO confidence_ledger (ticker, sector, initial_confidence, adjusted_confidence, created_at)
            VALUES ($1, $2, $3, $4, NOW())
        `, [ticker, sector || 'General', initial, adjusted]);
    } catch (e) { console.error("Ledger Log Error", e); }
  }

  // 3. CLOSE: Record the result (Called when trade closes)
  async recordOutcome(ticker: string, pnlPct: number) {
    try {
        // Update the most recent open entry for this ticker
        await pool.query(`
            UPDATE confidence_ledger
            SET outcome_pnl_pct = $1
            WHERE ticker = $2 AND outcome_pnl_pct IS NULL
            AND created_at > NOW() - INTERVAL '60 days'
        `, [pnlPct, ticker]);
        
        // Trigger recalibration
        await this.recalibrate();
    } catch (e) { console.error("Ledger Outcome Error", e); }
  }

  // 4. LEARN: Recalibrate weights based on reality
  async recalibrate() {
    // console.log("      ⚖️  Recalibrating Confidence Models...");
    const sectors = ['Technology', 'Energy', 'Financial Services', 'Healthcare', 'General'];
    const buckets = ['HIGH', 'MED', 'LOW'];

    for (const sector of sectors) {
        for (const bucket of buckets) {
            let minScore = 0, maxScore = 100;
            if (bucket === 'HIGH') { minScore = 85; }
            else if (bucket === 'MED') { minScore = 70; maxScore = 84; }
            else { maxScore = 69; }

            const res = await pool.query(`
                SELECT
                    COUNT(*) as total,
                    SUM(CASE WHEN outcome_pnl_pct > 0 THEN 1 ELSE 0 END) as wins
                FROM confidence_ledger
                WHERE (sector = $1 OR $1 = 'General')
                AND adjusted_confidence BETWEEN $2 AND $3
                AND outcome_pnl_pct IS NOT NULL
            `, [sector, minScore, maxScore]);

            const total = parseInt(res.rows[0].total);
            const wins = parseInt(res.rows[0].wins);

            if (total > 5) { // Need statistical significance
                const realWinRate = (wins / total) * 100;
                
                // Calculate Target Win Rate for this bucket
                const targetWinRate = bucket === 'HIGH' ? 75 : bucket === 'MED' ? 60 : 50;
                
                // Calculate Adjustment Factor
                // If Real (50%) < Target (75%), Factor < 1.0 (Dampen)
                let factor = 1.0;
                if (realWinRate < targetWinRate) factor = 0.9; // Penalize overconfidence
                if (realWinRate > targetWinRate + 15) factor = 1.05; // Reward underconfidence

                await pool.query(`
                    INSERT INTO confidence_calibration (sector, confidence_bucket, actual_win_rate, adjustment_factor, last_updated)
                    VALUES ($1, $2, $3, $4, NOW())
                    ON CONFLICT (sector, confidence_bucket) DO UPDATE
                    SET actual_win_rate = $3, adjustment_factor = $4, last_updated = NOW()
                `, [sector, bucket, realWinRate, factor]);
                
                if (factor !== 1.0) {
                    console.log(`      -> Adjusted ${sector} [${bucket}]: Real WR ${realWinRate.toFixed(1)}% vs Target ${targetWinRate}%. Factor: ${factor}`);
                }
            }
        }
    }
  }

  private getBucket(score: number): string {
      if (score >= 85) return 'HIGH';
      if (score >= 70) return 'MED';
      return 'LOW';
  }
}

export default new ConfidenceLedgerService();
