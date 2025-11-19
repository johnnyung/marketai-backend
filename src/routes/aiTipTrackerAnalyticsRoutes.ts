// backend/src/routes/aiTipTrackerAnalyticsRoutes.ts
// API Routes for AI Tip Tracker Analytics

import express from 'express';
import aiTipTrackerAnalyticsService from '../services/aiTipTrackerAnalyticsService.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/ai-tip-tracker/analytics/monthly-trends
 * Get monthly performance trends (last 12 months)
 */
router.get('/monthly-trends', authenticateToken, async (req, res) => {
  try {
    const trends = await aiTipTrackerAnalyticsService.getMonthlyTrends();
    
    res.json({
      success: true,
      data: trends
    });
  } catch (error) {
    console.error('Error fetching monthly trends:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch monthly trends'
    });
  }
});

/**
 * GET /api/ai-tip-tracker/analytics/confidence-brackets
 * Get performance by confidence level
 */
router.get('/confidence-brackets', authenticateToken, async (req, res) => {
  try {
    const brackets = await aiTipTrackerAnalyticsService.getConfidenceBrackets();
    
    res.json({
      success: true,
      data: brackets
    });
  } catch (error) {
    console.error('Error fetching confidence brackets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch confidence brackets'
    });
  }
});

/**
 * GET /api/ai-tip-tracker/analytics/sector-performance
 * Get performance by sector
 */
router.get('/sector-performance', authenticateToken, async (req, res) => {
  try {
    const sectors = await aiTipTrackerAnalyticsService.getSectorPerformance();
    
    res.json({
      success: true,
      data: sectors
    });
  } catch (error) {
    console.error('Error fetching sector performance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sector performance'
    });
  }
});

/**
 * GET /api/ai-tip-tracker/analytics/timeframe-performance
 * Get performance by timeframe
 */
router.get('/timeframe-performance', authenticateToken, async (req, res) => {
  try {
    const timeframes = await aiTipTrackerAnalyticsService.getTimeframePerformance();
    
    res.json({
      success: true,
      data: timeframes
    });
  } catch (error) {
    console.error('Error fetching timeframe performance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch timeframe performance'
    });
  }
});

/**
 * GET /api/ai-tip-tracker/analytics/top-performers
 * Get top performers leaderboard
 */
router.get('/top-performers', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const topPerformers = await aiTipTrackerAnalyticsService.getTopPerformers(limit);
    
    res.json({
      success: true,
      data: topPerformers,
      count: topPerformers.length
    });
  } catch (error) {
    console.error('Error fetching top performers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch top performers'
    });
  }
});

/**
 * GET /api/ai-tip-tracker/analytics/worst-performers
 * Get worst performers
 */
router.get('/worst-performers', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const worstPerformers = await aiTipTrackerAnalyticsService.getWorstPerformers(limit);
    
    res.json({
      success: true,
      data: worstPerformers,
      count: worstPerformers.length
    });
  } catch (error) {
    console.error('Error fetching worst performers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch worst performers'
    });
  }
});

/**
 * GET /api/ai-tip-tracker/analytics/recent-wins
 * Get recent wins (last 7 days by default)
 */
router.get('/recent-wins', authenticateToken, async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const recentWins = await aiTipTrackerAnalyticsService.getRecentWins(days);
    
    res.json({
      success: true,
      data: recentWins,
      count: recentWins.length
    });
  } catch (error) {
    console.error('Error fetching recent wins:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent wins'
    });
  }
});

/**
 * GET /api/ai-tip-tracker/analytics/roi-projections
 * Get ROI projections based on historical data
 */
router.get('/roi-projections', authenticateToken, async (req, res) => {
  try {
    const projections = await aiTipTrackerAnalyticsService.getROIProjections();
    
    res.json({
      success: true,
      data: projections
    });
  } catch (error) {
    console.error('Error fetching ROI projections:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch ROI projections'
    });
  }
});

/**
 * GET /api/ai-tip-tracker/analytics/benchmark-comparison
 * Get performance vs S&P 500 benchmark
 */
router.get('/benchmark-comparison', authenticateToken, async (req, res) => {
  try {
    const comparison = await aiTipTrackerAnalyticsService.getBenchmarkComparison();
    
    res.json({
      success: true,
      data: comparison
    });
  } catch (error) {
    console.error('Error fetching benchmark comparison:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch benchmark comparison'
    });
  }
});

/**
 * GET /api/ai-tip-tracker/analytics/quick-stats
 * Get quick stats for dashboard
 */
router.get('/quick-stats', authenticateToken, async (req, res) => {
  try {
    const stats = await aiTipTrackerAnalyticsService.getQuickStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching quick stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch quick stats'
    });
  }
});

/**
 * GET /api/ai-tip-tracker/analytics/comprehensive
 * Get all analytics data in one call (for dashboard)
 */
router.get('/comprehensive', authenticateToken, async (req, res) => {
  try {
    // Fetch with individual error handling
    const results = await Promise.allSettled([
      aiTipTrackerAnalyticsService.getQuickStats(),
      aiTipTrackerAnalyticsService.getMonthlyTrends(),
      aiTipTrackerAnalyticsService.getConfidenceBrackets(),
      aiTipTrackerAnalyticsService.getSectorPerformance(),
      aiTipTrackerAnalyticsService.getTimeframePerformance(),
      aiTipTrackerAnalyticsService.getTopPerformers(10),
      aiTipTrackerAnalyticsService.getRecentWins(7),
      aiTipTrackerAnalyticsService.getROIProjections(),
      aiTipTrackerAnalyticsService.getBenchmarkComparison()
    ]);
    
    // Extract results with fallbacks
    const [
      quickStats,
      monthlyTrends,
      confidenceBrackets,
      sectorPerformance,
      timeframePerformance,
      topPerformers,
      recentWins,
      roiProjections,
      benchmarkComparison
    ] = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        console.error(`Analytics fetch ${index} failed:`, result.reason);
        return null;
      }
    });
    
    res.json({
      success: true,
      data: {
        quickStats: quickStats || {},
        monthlyTrends: monthlyTrends || [],
        confidenceBrackets: confidenceBrackets || [],
        sectorPerformance: sectorPerformance || [],
        timeframePerformance: timeframePerformance || [],
        topPerformers: topPerformers || [],
        recentWins: recentWins || [],
        roiProjections: roiProjections || null,
        benchmarkComparison: benchmarkComparison || null
      }
    });
  } catch (error) {
    console.error('Error fetching comprehensive analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch comprehensive analytics'
    });
  }
});

export default router;
