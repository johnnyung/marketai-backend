import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import edgarService from '../services/edgarService.js';
import tradingOpportunitiesService from '../services/tradingOpportunitiesService.js';

const router = Router();

// 1. WAR ROOM SIGNALS (The Watchlist Source)
router.get('/signals', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const signals = await tradingOpportunitiesService.generateTradingSignals(limit);
    
    res.json({
      success: true,
      count: signals.length,
      signals,
      generatedAt: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Signals Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. EDGAR OPPORTUNITIES (Legacy/IPO)
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const summary = await edgarService.getOpportunitySummary();
    res.json({ success: true, data: summary });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/recent', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const opportunities = await edgarService.getRecentOpportunities(limit);
    res.json({ success: true, data: opportunities });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/ingest', authenticateToken, async (req, res) => {
  try {
    const result = await edgarService.ingestFilings();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
