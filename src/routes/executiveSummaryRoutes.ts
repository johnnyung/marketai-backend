// backend/src/routes/executiveSummaryRoutes.ts
// API routes for Executive Summary

import express from 'express';
import executiveSummaryService from '../services/executiveSummaryService.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/intelligence/executive-summary
 * Get today's executive summary (cached)
 */
router.get('/executive-summary', authenticateToken, async (req, res) => {
  try {
    console.log('📊 Executive summary requested');
    
    const summary = await executiveSummaryService.getExecutiveSummary();
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error: any) {
    console.error('Error fetching executive summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch executive summary'
    });
  }
});

/**
 * POST /api/intelligence/executive-summary/regenerate
 * Force regenerate executive summary
 */
router.post('/executive-summary/regenerate', authenticateToken, async (req, res) => {
  try {
    console.log('📊 Executive summary regeneration requested');
    
    const summary = await executiveSummaryService.regenerateExecutiveSummary();
    
    res.json({
      success: true,
      message: 'Executive summary regenerated successfully',
      data: summary
    });
  } catch (error: any) {
    console.error('Error regenerating executive summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to regenerate executive summary'
    });
  }
});

export default router;
