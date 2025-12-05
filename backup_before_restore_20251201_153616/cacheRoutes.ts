// backend/src/routes/cacheRoutes.ts
// API routes for Cache Monitoring and Management

import express from 'express';
import cacheMonitoringService from '../services/cacheMonitoringService.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/cache/stats
 * Get today's cache statistics
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await cacheMonitoringService.getTodayStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('Error fetching cache stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cache statistics'
    });
  }
});

/**
 * GET /api/cache/savings
 * Get total cost savings summary
 */
router.get('/savings', authenticateToken, async (req, res) => {
  try {
    const savings = await cacheMonitoringService.getTotalSavings();
    
    res.json({
      success: true,
      data: savings
    });
  } catch (error: any) {
    console.error('Error fetching savings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch savings data'
    });
  }
});

/**
 * GET /api/cache/sizes
 * Get cache sizes
 */
router.get('/sizes', authenticateToken, async (req, res) => {
  try {
    const sizes = await cacheMonitoringService.getCacheSizes();
    
    res.json({
      success: true,
      data: sizes
    });
  } catch (error: any) {
    console.error('Error fetching cache sizes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cache sizes'
    });
  }
});

/**
 * POST /api/cache/cleanup
 * Cleanup old cached data
 */
router.post('/cleanup', authenticateToken, async (req, res) => {
  try {
    const { daysToKeep } = req.body;
    const days = daysToKeep || 7;
    
    console.log(`🧹 Manual cache cleanup triggered (keeping ${days} days)`);
    
    const results = await cacheMonitoringService.cleanupOldCache(days);
    
    res.json({
      success: true,
      message: 'Cache cleanup complete',
      data: results
    });
  } catch (error: any) {
    console.error('Error during cleanup:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup cache'
    });
  }
});

/**
 * POST /api/cache/clear (DANGEROUS - for testing only)
 * Clear ALL cache
 */
router.post('/clear', authenticateToken, async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        error: 'Clear all cache is disabled in production'
      });
    }
    
    await cacheMonitoringService.clearAllCache();
    
    res.json({
      success: true,
      message: 'All cache cleared'
    });
  } catch (error: any) {
    console.error('Error clearing cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear cache'
    });
  }
});

export default router;
