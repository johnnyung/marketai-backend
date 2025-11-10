// backend/src/routes/intelligenceThreadsRoutes.ts
// API routes for Intelligence Threads

import express from 'express';
import intelligenceThreadsService from '../services/intelligenceThreadsService.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/threads
 * Get all active intelligence threads
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const threads = await intelligenceThreadsService.getActiveThreads(limit);
    
    res.json({
      success: true,
      data: threads,
      count: threads.length
    });
  } catch (error: any) {
    console.error('Error fetching threads:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch intelligence threads'
    });
  }
});

/**
 * GET /api/threads/:id
 * Get specific thread by ID
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const threadId = parseInt(req.params.id);
    const thread = await intelligenceThreadsService.getThreadById(threadId);
    
    if (!thread) {
      return res.status(404).json({
        success: false,
        error: 'Thread not found'
      });
    }
    
    res.json({
      success: true,
      data: thread
    });
  } catch (error: any) {
    console.error('Error fetching thread:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch thread'
    });
  }
});

/**
 * POST /api/threads/generate
 * Force regenerate intelligence threads
 */
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    const hoursBack = parseInt(req.body.hoursBack as string) || 72;
    
    console.log(`📊 Manual thread generation requested (${hoursBack} hours)`);
    
    const threads = await intelligenceThreadsService.generateThreads(hoursBack);
    
    res.json({
      success: true,
      message: `Generated ${threads.length} intelligence threads`,
      data: threads,
      count: threads.length
    });
  } catch (error: any) {
    console.error('Error generating threads:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate threads'
    });
  }
});

export default router;
