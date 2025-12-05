// backend/src/routes/dailyIntelligence.ts
// Routes for Daily Intelligence Reports

import express from 'express';
import dailyIntelligenceService from '../services/dailyIntelligenceService.js';

const router = express.Router();

/**
 * Generate today's intelligence report
 * POST /api/intelligence/daily/generate
 */
router.post('/daily/generate', async (req, res) => {
  try {
    console.log('📊 Generating daily intelligence report...');
    
    const report = await dailyIntelligenceService.generateDailyReport();
    
    res.json({
      success: true,
      message: 'Daily intelligence report generated',
      report: {
        date: report.date,
        summary: report.summary,
        topStoriesCount: report.topStories.length,
        marketMoversCount: report.marketMovers.length,
        geopoliticalAlertsCount: report.geopoliticalAlerts.length,
        economicIndicatorsCount: report.economicIndicators.length,
        cryptoTrendsCount: report.cryptoTrends.length,
        recommendations: report.recommendations
      }
    });
    
  } catch (error) {
    console.error('❌ Report generation failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Report generation failed'
    });
  }
});

/**
 * Get latest intelligence report
 * GET /api/intelligence/daily/latest
 */
router.get('/daily/latest', async (req, res) => {
  try {
    const report = await dailyIntelligenceService.getLatestReport();
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'No reports available. Generate one first.'
      });
    }
    
    // JSONB columns are already parsed by PostgreSQL, no need to JSON.parse
    res.json({
      success: true,
      report: {
        date: report.report_date,
        summary: report.executive_summary,
        topStories: report.top_stories || [],
        marketMovers: report.market_movers || [],
        geopoliticalAlerts: report.geopolitical_alerts || [],
        economicIndicators: report.economic_indicators || [],
        cryptoTrends: report.crypto_trends || [],
        recommendations: report.recommendations || [],
        generatedAt: report.generated_at
      }
    });
    
  } catch (error) {
    console.error('❌ Failed to get latest report:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get report'
    });
  }
});

/**
 * Get recent reports (last 7 days by default)
 * GET /api/intelligence/daily/recent
 */
router.get('/daily/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 7;
    
    if (limit < 1 || limit > 30) {
      return res.status(400).json({
        success: false,
        error: 'Limit must be between 1 and 30'
      });
    }
    
    const reports = await dailyIntelligenceService.getRecentReports(limit);
    
    res.json({
      success: true,
      count: reports.length,
      reports: reports.map(report => ({
        date: report.report_date,
        summary: report.executive_summary,
        topStoriesCount: (report.top_stories || []).length,
        marketMoversCount: (report.market_movers || []).length,
        geopoliticalAlertsCount: (report.geopolitical_alerts || []).length,
        recommendations: report.recommendations || [],
        generatedAt: report.generated_at
      }))
    });
    
  } catch (error) {
    console.error('❌ Failed to get recent reports:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get reports'
    });
  }
});

/**
 * Get report by date
 * GET /api/intelligence/daily/:date (YYYY-MM-DD)
 */
router.get('/daily/:date', async (req, res) => {
  try {
    const { date } = req.params;
    
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format. Use YYYY-MM-DD'
      });
    }
    
    const report = await dailyIntelligenceService.getReportByDate(date);
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: `No report found for ${date}`
      });
    }
    
    // JSONB columns are already parsed by PostgreSQL
    res.json({
      success: true,
      report: {
        date: report.report_date,
        summary: report.executive_summary,
        topStories: report.top_stories || [],
        marketMovers: report.market_movers || [],
        geopoliticalAlerts: report.geopolitical_alerts || [],
        economicIndicators: report.economic_indicators || [],
        cryptoTrends: report.crypto_trends || [],
        recommendations: report.recommendations || [],
        generatedAt: report.generated_at
      }
    });
    
  } catch (error) {
    console.error('❌ Failed to get report:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get report'
    });
  }
});

export default router;
