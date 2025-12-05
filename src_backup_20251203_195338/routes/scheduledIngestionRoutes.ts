// backend/src/routes/scheduledIngestion.ts
// Routes to control and monitor scheduled ingestion

import express from 'express';
import scheduledIngestionService from '../services/scheduledIngestionService.js';

const router = express.Router();

/**
 * Get scheduler status
 * GET /api/digest/scheduler/status
 */
router.get('/scheduler/status', (req, res) => {
  const status = scheduledIngestionService.getStatus();
  res.json({
    success: true,
    scheduler: status
  });
});

/**
 * Manually trigger ingestion (for testing)
 * POST /api/digest/scheduler/trigger
 */
router.post('/scheduler/trigger', async (req, res) => {
  try {
    // Don't await - run in background
    scheduledIngestionService.triggerManual().catch(error => {
      console.error('Manual ingestion error:', error);
    });
    
    res.json({
      success: true,
      message: 'Manual ingestion triggered (running in background)'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Trigger failed'
    });
  }
});

export default router;
