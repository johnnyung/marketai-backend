import express from 'express';
import pool from '../db/index.js';

const router = express.Router();

// GET /api/confidence/engine-stats
router.get('/engine-stats', async (req, res) => {
  try {
    // 1. 30-Day Accuracy Curve
    const accuracyRes = await pool.query(`
        SELECT
            DATE(date_predicted) as date,
            COUNT(*) as total,
            SUM(CASE WHEN result_outcome = 'WIN' THEN 1 ELSE 0 END) as wins
        FROM prediction_results
        WHERE result_outcome IN ('WIN', 'LOSS')
        AND date_predicted > NOW() - INTERVAL '30 days'
        GROUP BY DATE(date_predicted)
        ORDER BY date ASC
    `);
    
    const accuracyCurve = accuracyRes.rows.map(r => ({
        date: r.date,
        winRate: parseInt(r.total) > 0 ? (parseInt(r.wins) / parseInt(r.total)) * 100 : 0
    }));

    // 2. Agent Reliability Table
    const agentRes = await pool.query(`
        SELECT agent_name, win_rate, reliability_multiplier, consistency_score
        FROM agent_reliability_snapshots
        WHERE snapshot_date = CURRENT_DATE
        ORDER BY win_rate DESC
    `);

    // 3. 7-Day Confidence Trend
    const confidenceRes = await pool.query(`
        SELECT
            DATE(created_at) as date,
            AVG(confidence) as avg_conf
        FROM ai_stock_tips
        WHERE created_at > NOW() - INTERVAL '7 days'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
    `);

    res.json({
        success: true,
        data: {
            accuracy_30d: accuracyCurve,
            agent_performance: agentRes.rows,
            confidence_trend_7d: confidenceRes.rows
        }
    });

  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
