// backend/src/routes/intelligenceThreadsRoutes.ts
// API Routes for Intelligence Threads

import express from 'express';
import intelligenceThreadsService from '../services/intelligenceThreadsService.js';
import { authenticateToken } from '../middleware/auth.js';
import { pool } from '../db/index.js';

const router = express.Router();

/**
 * GET /api/threads
 * Get all threads with optional status filter
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status } = req.query;
    
    let query = `
      SELECT 
        id,
        thread_name as "threadName",
        description,
        relevance_score as "confidenceScore",
        affected_tickers as "affectedTickers",
        array_length(entry_ids, 1) as "entryCount",
        status,
        created_at as "createdDate",
        updated_at as "updatedDate"
      FROM intelligence_threads
    `;
    
    const params: any[] = [];
    
    if (status) {
      query += ` WHERE status = $1`;
      params.push(status);
    }
    
    query += ` ORDER BY updated_at DESC`;
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      threads: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching threads:', error);
    res.json({ 
      success: true,
      threads: [], 
      count: 0 
    });
  }
});

/**
 * POST /api/threads/detect
 * Run thread detection on recent entries
 */
router.post('/detect', authenticateToken, async (req, res) => {
  try {
    console.log('🧵 Manual thread detection triggered');
    const threadsCreated = await intelligenceThreadsService.detectAndCreateThreads();
    
    res.json({
      success: true,
      data: {
        threadsCreated,
        message: threadsCreated > 0 
          ? `Created ${threadsCreated} new intelligence thread${threadsCreated > 1 ? 's' : ''}`
          : 'No new threads detected'
      }
    });
  } catch (error: any) {
    console.error('Thread detection error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to detect threads'
    });
  }
});

/**
 * GET /api/threads/active
 * Get all active threads
 */
router.get('/active', authenticateToken, async (req, res) => {
  try {
    const threads = await intelligenceThreadsService.getActiveThreads();
    
    res.json({
      success: true,
      data: threads,
      threads: threads,  // For Dashboard compatibility
      count: threads.length
    });
  } catch (error) {
    console.error('Error fetching active threads:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch active threads'
    });
  }
});

/**
 * GET /api/threads/:id
 * Get thread by ID with all events
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
  } catch (error) {
    console.error('Error fetching thread:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch thread'
    });
  }
});

/**
 * PUT /api/threads/:id/status
 * Update thread status
 */
router.put('/:id/status', authenticateToken, async (req, res) => {
  try {
    const threadId = parseInt(req.params.id);
    const { status } = req.body;
    
    if (!['ACTIVE', 'MONITORING', 'RESOLVED', 'ARCHIVED'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be ACTIVE, MONITORING, RESOLVED, or ARCHIVED'
      });
    }
    
    await intelligenceThreadsService.updateThreadStatus(threadId, status);
    
    res.json({
      success: true,
      data: {
        message: `Thread ${threadId} status updated to ${status}`
      }
    });
  } catch (error) {
    console.error('Error updating thread status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update thread status'
    });
  }
});

export default router;
