// src/routes/aiTips.ts
import express from 'express';
import pool from '../db/index.js';
import aiTipGenerator from '../services/aiTipGenerator.js';
import confidenceRecalibrationService from '../services/confidenceRecalibrationService.js'; // NEW
import agentReliabilityService from '../services/agentReliabilityService.js'; // NEW

const router = express.Router();

// Generate new tips (deletes old first)
router.post('/generate', async (req, res) => {
  try {
    console.log('🔄 Generating tips...');
    await pool.query('DELETE FROM ai_stock_tips');
    
    const tips = await aiTipGenerator.generateComprehensiveTips();
    
    res.json({ success: true, data: tips });
  } catch (error: any) {
    console.error('Generation failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get tips by tier
router.get('/by-tier/:tier', async (req, res) => {
  try {
    const { tier } = req.params;
    
    const result = await pool.query(`
      SELECT * FROM ai_stock_tips
      WHERE tier = $1 AND status = 'active'
      ORDER BY confidence DESC, expected_gain_percent DESC
    `, [tier]);
    
    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all active tips - ENHANCED FOR PHASE 5
router.get('/active', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM ai_stock_tips
      WHERE status = 'active'
      ORDER BY tier, confidence DESC
    `);
    
    // Inject Learning Layer Data
    const enhancedData = await Promise.all(result.rows.map(async (row) => {
        const matrix = row.decision_matrix || {};
        const engines = matrix.engines || {};

        // Recalculate confidence to be safe (ensure display matches engine)
        // In Phase 4, this is already saved to DB, but we re-run to get the "Reasons" object
        const recal = await confidenceRecalibrationService.recalibrate(
            50, // Base (dummy, we just want the multipliers)
            engines.agents, // Multi-Agent Breakdown
            engines.fsi,
            engines.narrative,
            engines.shadow,
            engines.regime
        );

        return {
            ...row,
            // --- POT PHASE 5 EXTENSIONS ---
            confidence_reasons: [
                recal.reason,
                `FSI Traffic Light: ${engines.fsi?.traffic_light || 'N/A'}`,
                `Regime: ${engines.regime?.current_regime || 'N/A'}`,
                `Shadow Bias: ${engines.shadow?.bias || 'N/A'}`
            ],
            agent_reliability_scores: await getAgentStats(),
            fsi_factors: engines.fsi,
            narrative_trend_alignment: engines.narrative?.pressure_score > 60 ? 'ALIGNED' : 'NEUTRAL',
            shadow_liquidity_alignment: engines.shadow?.bias,
            
            // PHFA Extensions
            risk_adjusted_confidence: row.confidence, // Already adjusted in Phase 4
            reliability_explanation: `Confidence modified by ${recal.multipliers.agent.toFixed(2)}x based on recent agent performance.`
        };
    }));
    
    res.json({ success: true, data: enhancedData });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper to get agent stats
async function getAgentStats() {
    try {
        const res = await pool.query(`
            SELECT agent_name, win_rate, reliability_multiplier
            FROM agent_reliability_snapshots
            WHERE snapshot_date = CURRENT_DATE
        `);
        return res.rows;
    } catch (e) { return []; }
}

// Close position
router.post('/close/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { exit_price } = req.body;
    
    const result = await pool.query(`
      UPDATE ai_stock_tips
      SET status = 'closed', exit_price = $1
      WHERE id = $2
      RETURNING *
    `, [exit_price, id]);
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get stats
router.get('/stats', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total_tips,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as open_positions,
        COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_positions,
        AVG(confidence) as avg_confidence
      FROM ai_stock_tips
    `);
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
