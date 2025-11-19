// src/routes/aiTipsRoutes.ts
// Backend routes for AI Tip Tracker

import express from 'express';
import pool from '../db/index.js';
import enhancedAiTipGenerator from '../services/aiTipGenerator.js';

const router = express.Router();

// Generate new AI tips (with auto-cleanup)
router.post('/generate', async (req, res) => {
  try {
    console.log('🔄 Starting tip generation...');
    
    // DELETE OLD TIPS FIRST
    console.log('🗑️  Deleting old tips...');
    await pool.query(`DELETE FROM ai_stock_tips`);
    console.log('✅ Old tips cleared');
    
    // Generate new tips
    const tips = await enhancedAiTipGenerator.generateComprehensiveTips();
    
    res.json({
      success: true,
      data: tips
    });
  } catch (error: any) {
    console.error('Error generating tips:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get tips by tier
router.get('/by-tier/:tier', async (req, res) => {
  try {
    const { tier } = req.params;
    
    const result = await pool.query(`
      SELECT * FROM ai_stock_tips
      WHERE tier = $1
      AND status = 'active'
      ORDER BY confidence DESC, expected_gain_percent DESC
    `, [tier]);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching tips by tier:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tips'
    });
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
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching active tips:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tips'
    });
  }
});

// Get all AI tips
router.get('/all', async (req, res) => {
  try {
    const query = `
      SELECT 
        id,
        ticker,
        action,
        tier,
        entry_price,
        target_price,
        stop_loss,
        expected_gain_percent,
        risk_score,
        confidence,
        timeframe,
        catalysts,
        reasoning,
        exit_strategy,
        status,
        created_at
      FROM ai_stock_tips
      ORDER BY created_at DESC
      LIMIT 100
    `;
    
    const result = await pool.query(query);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching AI tips:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch AI tips'
    });
  }
});

// Close a position
router.post('/close/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { exit_price } = req.body;
    
    const query = `
      UPDATE ai_stock_tips
      SET 
        status = 'closed',
        exit_price = $1
      WHERE id = $2
      RETURNING *
    `;
    
    const result = await pool.query(query, [exit_price, id]);
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error closing position:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to close position'
    });
  }
});

// Get performance stats
router.get('/stats', async (req, res) => {
  try {
    const statsQuery = `
      SELECT
        COUNT(*) as total_tips,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as open_positions,
        COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed_positions,
        AVG(confidence) as avg_confidence
      FROM ai_stock_tips
    `;
    
    const result = await pool.query(statsQuery);
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stats'
    });
  }
});

export default router;
