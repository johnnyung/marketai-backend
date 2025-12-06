import { pool } from '../db/index.js';

interface CategoryPerformance {
  tier: string;
  winRate: number;
  totalTrades: number;
  suggestedThreshold: number;
  status: 'heating_up' | 'cooling_down' | 'neutral';
}

class ConfidenceAdjustmentService {

  async getAdaptiveThresholds(): Promise<Record<string, number>> {
    console.log("   ⚖️  Calibrating Confidence Thresholds...");
    
    const thresholds: Record<string, number> = {
        'blue_chip': 80,       // Default
        'explosive_growth': 80,
        'crypto_alpha': 85,    // Higher default for crypto
        'insider_play': 80,
        'sector_play': 80
    };

    try {
        // Analyze last 20 closed trades per category
        const res = await pool.query(`
            SELECT
                tier,
                COUNT(*) as total,
                SUM(CASE WHEN final_pnl > 0 THEN 1 ELSE 0 END) as wins
            FROM ai_stock_tips
            WHERE status = 'CLOSED'
            AND created_at > NOW() - INTERVAL '14 days'
            GROUP BY tier
        `);

        for (const row of res.rows) {
            const winRate = (parseInt(row.wins) / parseInt(row.total)) * 100;
            let newThreshold = 80;

            if (winRate < 40) {
                // COLD STREAK: Tighten the belt. Only perfect setups.
                newThreshold = 90;
                console.log(`      ❄️  ${row.tier} is COLD (${winRate.toFixed(0)}% WR). Raising bar to ${newThreshold}.`);
            } else if (winRate > 70) {
                // HOT STREAK: Loosen up to catch more runners.
                newThreshold = 75;
                console.log(`      🔥 ${row.tier} is HOT (${winRate.toFixed(0)}% WR). Lowering bar to ${newThreshold}.`);
            } else {
                console.log(`      😐 ${row.tier} is NORMAL (${winRate.toFixed(0)}% WR). Keeping at ${newThreshold}.`);
            }

            thresholds[row.tier] = newThreshold;
        }
    } catch (e) {
        console.error("Confidence Adjustment Error:", e);
    }

    return thresholds;
  }
}

export default new ConfidenceAdjustmentService();
