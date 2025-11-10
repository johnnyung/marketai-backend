/**
 * AI TIP TRACKER API ROUTES - FIXED VERSION
 */

import express from 'express';
import aiTipTrackerService from '../services/aiTipTrackerService.js';
import { authenticateToken } from '../middleware/auth.js';
import pool from '../db/index.js';

const router = express.Router();

/**
 * GET /api/ai-tip-tracker/summary
 */
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const periodType = (req.query.period as string) || 'ALL_TIME';
    const summary = await aiTipTrackerService.getPerformanceSummary(periodType);
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error fetching AI Tip Tracker summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch summary statistics'
    });
  }
});

/**
 * GET /api/ai-tip-tracker/positions/open
 */
router.get('/positions/open', authenticateToken, async (req, res) => {
  try {
    const positions = await aiTipTrackerService.getOpenPositions();
    
    res.json({
      success: true,
      data: positions,
      count: positions.length
    });
  } catch (error) {
    console.error('Error fetching open positions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch open positions'
    });
  }
});

/**
 * GET /api/ai-tip-tracker/positions/closed
 */
router.get('/positions/closed', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const positions = await aiTipTrackerService.getClosedPositions(limit);
    
    res.json({
      success: true,
      data: positions,
      count: positions.length
    });
  } catch (error) {
    console.error('Error fetching closed positions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch closed positions'
    });
  }
});

/**
 * POST /api/ai-tip-tracker/position
 */
router.post('/position', authenticateToken, async (req, res) => {
  try {
    const recommendation = req.body;
    
    if (!recommendation.ticker || !recommendation.entryPrice || !recommendation.aiReasoning) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: ticker, entryPrice, aiReasoning'
      });
    }
    
    const positionId = await aiTipTrackerService.createPosition(recommendation);
    
    res.json({
      success: true,
      data: {
        positionId,
        message: `Created tracked position for ${recommendation.ticker}`
      }
    });
  } catch (error) {
    console.error('Error creating AI Tip Tracker position:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create position'
    });
  }
});

/**
 * POST /api/ai-tip-tracker/position/:id/close
 */
router.post('/position/:id/close', authenticateToken, async (req, res) => {
  try {
    const positionId = parseInt(req.params.id);
    const { exitReason, exitTriggeredBy } = req.body;
    
    await aiTipTrackerService.closePosition(
      positionId,
      exitReason || 'Manual Close',
      exitTriggeredBy || 'Manual'
    );
    
    res.json({
      success: true,
      data: {
        message: `Position ${positionId} closed successfully`
      }
    });
  } catch (error) {
    console.error('Error closing position:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to close position'
    });
  }
});

/**
 * POST /api/ai-tip-tracker/update-all
 */
router.post('/update-all', authenticateToken, async (req, res) => {
  try {
    await aiTipTrackerService.updateAllPositions();
    
    res.json({
      success: true,
      data: {
        message: 'All positions updated successfully'
      }
    });
  } catch (error) {
    console.error('Error updating positions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update positions'
    });
  }
});

/**
 * GET /api/ai-tip-tracker/stats/quick
 */
router.get('/stats/quick', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ai_tip_tracker_quick_stats');
    
    res.json({
      success: true,
      data: result.rows[0] || {}
    });
  } catch (error) {
    console.error('Error fetching quick stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch quick stats'
    });
  }
});

export default router;
