// src/routes/schedulerRoutes.ts
// Routes for managing and monitoring the data collection scheduler - FIXED

import express from 'express';
import comprehensiveDataScheduler from '../schedulers/comprehensiveDataScheduler.js';
import { pool } from '../db/index.js';

const router = express.Router();

// Define types
interface ScheduleInfo {
  name: string;
  time: string;
  days: string;
  timezone: string;
}

// Get scheduler status
router.get('/status', async (req, res) => {
  try {
    const status = comprehensiveDataScheduler.getStatus();
    
    // Get recent collection stats from database
    const recentLogs = await pool.query(`
      SELECT 
        job_type,
        job_status,
        items_processed,
        duration_ms,
        created_at
      FROM scheduler_logs
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    // Get collection statistics for today
    const todayStats = await pool.query(`
      SELECT 
        COUNT(*) as total_runs,
        SUM(items_processed) as total_items,
        AVG(duration_ms) as avg_duration,
        COUNT(*) FILTER (WHERE job_status = 'success') as successful_runs
      FROM scheduler_logs
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `);
    
    res.json({
      success: true,
      data: {
        scheduler: status,
        recentRuns: recentLogs.rows,
        todayStats: todayStats.rows[0],
        schedule: {
          preMarket: '4:00 AM EST',
          marketOpen: '9:30 AM EST',
          midDay: '12:00 PM EST',
          marketClose: '4:00 PM EST',
          evening: '6:00 PM EST',
          weekend: 'Saturday 10:00 AM EST',
          periodic: 'Every 4 hours'
        }
      }
    });
  } catch (error) {
    console.error('Get scheduler status error:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

// Start scheduler
router.post('/start', async (req, res) => {
  try {
    comprehensiveDataScheduler.start();
    
    // Log the action - Fixed: use userId instead of id
    const userId = (req as any).user?.userId || 'system';
    await pool.query(`
      INSERT INTO scheduler_logs (
        job_type, job_status, details, created_at
      ) VALUES ('scheduler_control', 'started', $1, NOW())
    `, [JSON.stringify({ user: userId })]);
    
    res.json({
      success: true,
      message: 'Scheduler started successfully'
    });
  } catch (error) {
    console.error('Start scheduler error:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

// Stop scheduler
router.post('/stop', async (req, res) => {
  try {
    comprehensiveDataScheduler.stop();
    
    // Log the action - Fixed: use userId instead of id
    const userId = (req as any).user?.userId || 'system';
    await pool.query(`
      INSERT INTO scheduler_logs (
        job_type, job_status, details, created_at
      ) VALUES ('scheduler_control', 'stopped', $1, NOW())
    `, [JSON.stringify({ user: userId })]);
    
    res.json({
      success: true,
      message: 'Scheduler stopped successfully'
    });
  } catch (error) {
    console.error('Stop scheduler error:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

// Force run a collection
router.post('/force-run', async (req, res) => {
  try {
    const { collectionType = 'all' } = req.body;
    
    // Start the collection asynchronously
    comprehensiveDataScheduler.forceRun(collectionType).catch(error => {
      console.error('Force run error:', error);
    });
    
    res.json({
      success: true,
      message: `Force run initiated for ${collectionType}`
    });
  } catch (error) {
    console.error('Force run error:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

// Get collection history
router.get('/history', async (req, res) => {
  try {
    const { days = 7, limit = 100 } = req.query;
    
    const history = await pool.query(`
      SELECT 
        job_type,
        job_status,
        items_processed,
        duration_ms,
        details,
        error_message,
        created_at
      FROM scheduler_logs
      WHERE created_at > NOW() - INTERVAL '${parseInt(days as string)} days'
      ORDER BY created_at DESC
      LIMIT ${parseInt(limit as string)}
    `);
    
    // Get aggregated stats by job type
    const stats = await pool.query(`
      SELECT 
        job_type,
        COUNT(*) as total_runs,
        COUNT(*) FILTER (WHERE job_status = 'success') as successful_runs,
        SUM(items_processed) as total_items,
        AVG(duration_ms) as avg_duration_ms,
        MAX(created_at) as last_run
      FROM scheduler_logs
      WHERE created_at > NOW() - INTERVAL '${parseInt(days as string)} days'
      GROUP BY job_type
      ORDER BY total_runs DESC
    `);
    
    res.json({
      success: true,
      data: {
        history: history.rows,
        stats: stats.rows
      }
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

// Get next scheduled runs
router.get('/next-runs', async (req, res) => {
  try {
    const now = new Date();
    // Fixed: explicitly type the array
    const nextRuns: ScheduleInfo[] = [];
    
    // Calculate next run times based on current time
    // This is simplified - in production you'd use a proper cron parser
    const schedules: ScheduleInfo[] = [
      { name: 'Pre-Market', time: '04:00', days: 'Mon-Fri', timezone: 'America/New_York' },
      { name: 'Market Open', time: '09:30', days: 'Mon-Fri', timezone: 'America/New_York' },
      { name: 'Mid-Day', time: '12:00', days: 'Mon-Fri', timezone: 'America/New_York' },
      { name: 'Market Close', time: '16:00', days: 'Mon-Fri', timezone: 'America/New_York' },
      { name: 'Evening Analysis', time: '18:00', days: 'Mon-Fri', timezone: 'America/New_York' },
      { name: 'Weekend Collection', time: '10:00', days: 'Saturday', timezone: 'America/New_York' }
    ];
    
    schedules.forEach(schedule => {
      nextRuns.push({
        name: schedule.name,
        time: schedule.time,
        days: schedule.days,
        timezone: schedule.timezone
      });
    });
    
    res.json({
      success: true,
      data: {
        currentTime: now.toISOString(),
        nextRuns: nextRuns
      }
    });
  } catch (error) {
    console.error('Get next runs error:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

// Clear old logs
router.delete('/logs', async (req, res) => {
  try {
    const { days = 30 } = req.body;
    
    const result = await pool.query(`
      DELETE FROM scheduler_logs
      WHERE created_at < NOW() - INTERVAL '${parseInt(days)} days'
    `);
    
    res.json({
      success: true,
      message: `Deleted ${result.rowCount} old log entries`
    });
  } catch (error) {
    console.error('Clear logs error:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

export default router;
