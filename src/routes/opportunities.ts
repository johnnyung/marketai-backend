// src/routes/opportunities.ts
import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import edgarService from '../services/edgarService.js';

const router = Router();

/**
 * GET /api/opportunities/summary
 * Get opportunity counts (IPOs, SPACs)
 */
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const summary = await edgarService.getOpportunitySummary();
    res.json({ success: true, data: summary });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/opportunities/recent
 * Get recent IPO/SPAC filings
 */
router.get('/recent', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const opportunities = await edgarService.getRecentOpportunities(limit);
    res.json({ success: true, data: opportunities });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/opportunities/ingest
 * Manually trigger SEC filing ingestion
 */
router.post('/ingest', authenticateToken, async (req, res) => {
  try {
    console.log('📋 Manual SEC ingestion triggered');
    const result = await edgarService.ingestFilings();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
