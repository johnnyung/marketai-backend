/**
 * AUTO TIP TRACKER ROUTES
 * Trigger comprehensive auto-tracking from all AI sources
 */

import express from 'express';
import autoTipTrackerOrchestrator from '../services/autoTipTrackerOrchestrator.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/auto-tip-tracker/track-all
 * Manually trigger auto-tracking from all sources
 */
router.post('/track-all', authenticateToken, async (req, res) => {
  try {
    console.log('🎯 Manual auto-tracking triggered by user');
    
    // Run in background
    autoTipTrackerOrchestrator.trackAllSources().catch(err => {
      console.error('Background auto-tracking failed:', err);
    });
    
    res.json({
      success: true,
      message: 'Auto-tracking started in background. Check logs for progress.'
    });
  } catch (error) {
    console.error('Error starting auto-tracking:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start auto-tracking'
    });
  }
});

export default router;
