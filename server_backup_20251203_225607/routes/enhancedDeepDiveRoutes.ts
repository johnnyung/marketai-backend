// backend/src/routes/enhancedDeepDiveRoutes.ts
// API routes for Enhanced Deep Dive Analysis

import express from 'express';
import enhancedDeepDiveService from '../services/enhancedDeepDiveService.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/deep-dive/enhanced/:ticker
 * Get comprehensive 2000+ word deep dive for any ticker
 */
router.get('/enhanced/:ticker', authenticateToken, async (req, res) => {
  try {
    const ticker = req.params.ticker.toUpperCase();
    console.log(`📊 Enhanced deep dive request for ${ticker}`);
    
    const analysis = await enhancedDeepDiveService.generateDeepDive(ticker);
    
    res.json({
      success: true,
      data: analysis
    });
  } catch (error: any) {
    console.error('Enhanced deep dive error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate deep dive analysis'
    });
  }
});

export default router;
