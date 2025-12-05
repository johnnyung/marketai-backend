// backend/src/routes/tradingOpportunities.ts
// Routes for AI-generated trading signals

import express from 'express';
import tradingOpportunitiesService from '../services/tradingOpportunitiesService.js';

const router = express.Router();

/**
 * Get current trading signals
 * GET /api/opportunities/signals?limit=5
 */
router.get('/signals', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 5;
    
    if (limit < 1 || limit > 10) {
      return res.status(400).json({
        success: false,
        error: 'Limit must be between 1 and 10'
      });
    }
    
    console.log(`📊 Generating ${limit} trading signals...`);
    
    const signals = await tradingOpportunitiesService.generateTradingSignals(limit);
    
    res.json({
      success: true,
      count: signals.length,
      signals,
      generatedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Failed to generate signals:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate signals'
    });
  }
});

/**
 * Get trading signal for specific ticker
 * GET /api/opportunities/signal/:ticker
 */
router.get('/signal/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    
    if (!ticker || ticker.length > 5) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ticker symbol'
      });
    }
    
    console.log(`🎯 Generating signal for ${ticker}...`);
    
    const signal = await tradingOpportunitiesService.generateTickerSignal(ticker);
    
    if (!signal) {
      return res.status(404).json({
        success: false,
        error: `No recent intelligence found for ${ticker.toUpperCase()}`
      });
    }
    
    res.json({
      success: true,
      signal,
      generatedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(`❌ Failed to generate signal for ${req.params.ticker}:`, error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate signal'
    });
  }
});



// ========================================================
// A14 — Top Opportunities Snapshot Route (SAFE WRAPPER)
// ========================================================
router.get("/top", async (req, res) => {
  try {
    const limitRaw = req.query.limit as string | undefined;
    const limit = Number.isFinite(Number(limitRaw)) && Number(limitRaw) > 0
      ? Number(limitRaw)
      : 10;

    // Lazy-require to avoid import order issues, and keep SAFE
    // with respect to existing module structure.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const tradingOpportunitiesService = require("../services/tradingOpportunitiesService").default;

    if (!tradingOpportunitiesService || typeof tradingOpportunitiesService.generateTradingSignals !== "function") {
      console.error("[A14] tradingOpportunitiesService.generateTradingSignals is not available.");
      return res.status(500).json({
        ok: false,
        error: "TOP_OPPORTUNITIES_SERVICE_UNAVAILABLE",
      });
    }

    const raw = await tradingOpportunitiesService.generateTradingSignals();

    let signals: any[] = [];
    if (Array.isArray(raw)) {
      signals = raw;
    } else if (raw && Array.isArray((raw as any).signals)) {
      signals = (raw as any).signals;
    } else if (raw && Array.isArray((raw as any).data)) {
      signals = (raw as any).data;
    }

    // Basic score-based sort; falls back to 0 when missing.
    const sorted = [...signals].sort((a, b) => {
      const sa = (a && typeof a.score === "number") ? a.score : 0;
      const sb = (b && typeof b.score === "number") ? b.score : 0;
      return sb - sa;
    });

    const top = sorted.slice(0, limit);

    return res.json({
      ok: true,
      count: top.length,
      data: top.map((s: any) => ({
        ticker: s.ticker ?? s.symbol ?? null,
        score: typeof s.score === "number" ? s.score : null,
        direction: s.direction ?? s.side ?? null,
        timeframe: s.timeframe ?? null,
        reason: s.reason ?? s.explanation ?? null,
        raw: s,
      })),
    });
  } catch (err) {
    console.error("[A14] TOP_OPPORTUNITIES_ROUTE_ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: "TOP_OPPORTUNITIES_FAILED",
    });
  }
});

export default router;
