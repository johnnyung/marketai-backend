// src/routes/aiTipTrackerRoutes.ts
import express from 'express';
import aiTipGenerator from '../services/aiTipGenerator.js';
import pool from '../db/index.js';

const router = express.Router();

// Generate new tips (manual trigger) - NEW 3-TIER SYSTEM
router.post('/generate', async (req, res) => {
  try {
    const tips = await aiTipGenerator.generateComprehensiveTips();
    res.json({ success: true, data: tips });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to generate tips' });
  }
});

// Get active tips (all tiers)
router.get('/active', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM ai_stock_tips
      WHERE status = 'active'
      ORDER BY tier, confidence DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch tips' });
  }
});

// Get tips by tier (NEW)
router.get('/by-tier/:tier', async (req, res) => {
  try {
    const { tier } = req.params;
    const tips = await aiTipGenerator.getTipsByTier(tier);
    res.json({ success: true, data: tips });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update tip performance (placeholder - implement tracking later)
router.post('/update-performance', async (req, res) => {
  try {
    // TODO: Implement performance tracking
    res.json({ success: true, message: 'Performance tracking coming soon' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to update' });
  }
});

export default router;
