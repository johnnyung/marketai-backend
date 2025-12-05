// src/routes/aiTips.ts
import express from 'express';
import pool from '../db/index.js';
import aiTipGenerator from '../services/aiTipGenerator.js';

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

// Get all active tips
router.get('/active', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM ai_stock_tips
      WHERE status = 'active'
      ORDER BY tier, confidence DESC
    `);
    
    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

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
