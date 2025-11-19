// src/routes/aiTipsRoutes.ts
// Backend routes for AI Tip Tracker

import express from 'express';
import pool from '../db/index.js';

const router = express.Router();

// Get all AI tips
router.get('/all', async (req, res) => {
  try {
    const query = `
      SELECT 
        id,
        ticker,
        recommendation_type,
        entry_price,
        current_price,
        ai_prediction_target,
        ai_confidence,
        ai_reasoning,
        ai_timeframe,
        ai_catalysts,
        ai_risks,
        status,
        created_at,
        closed_at,
        exit_price
      FROM ai_tip_tracker
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
      UPDATE ai_tip_tracker
      SET 
        status = 'CLOSED',
        closed_at = NOW(),
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
        COUNT(CASE WHEN status = 'OPEN' THEN 1 END) as open_positions,
        COUNT(CASE WHEN status = 'CLOSED' THEN 1 END) as closed_positions,
        AVG(ai_confidence) as avg_confidence
      FROM ai_tip_tracker
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
