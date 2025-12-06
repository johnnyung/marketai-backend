import { pool } from "../db/index.js";
// backend/src/routes/digestCleanup.ts
// Data Cleanup Routes - Remove bad dates and old entries

import express from 'express';
import { Pool } from 'pg';

const router = express.Router();


/**
 * Clean up bad dates and old data
 * GET /api/digest/cleanup
 */
router.post('/cleanup', async (req, res) => {
  try {
    console.log('🧹 Starting digest cleanup...');
    
    const results = {
      futureEntries: 0,
      oldEntries: 0,
      invalidDates: 0,
      expiredEntries: 0,
      total: 0
    };
    
    // 1. Remove entries with future dates (more than 24 hours ahead)
    const futureDate = new Date(Date.now() + (24 * 60 * 60 * 1000));
    const futureResult = await pool.query(`
      DELETE FROM digest_entries
      WHERE event_date > $1
      RETURNING id, source_type, event_date
    `, [futureDate]);
    results.futureEntries = futureResult.rowCount || 0;
    console.log(`  ✓ Removed ${results.futureEntries} entries with future dates`);
    
    // 2. Remove entries older than 1 year
    const oneYearAgo = new Date(Date.now() - (365 * 24 * 60 * 60 * 1000));
    const oldResult = await pool.query(`
      DELETE FROM digest_entries
      WHERE event_date < $1
      RETURNING id, source_type, event_date
    `, [oneYearAgo]);
    results.oldEntries = oldResult.rowCount || 0;
    console.log(`  ✓ Removed ${results.oldEntries} entries older than 1 year`);
    
    // 3. Remove entries that have already expired
    const expiredResult = await pool.query(`
      DELETE FROM digest_entries
      WHERE expires_at < NOW()
      RETURNING id, source_type
    `);
    results.expiredEntries = expiredResult.rowCount || 0;
    console.log(`  ✓ Removed ${results.expiredEntries} expired entries`);
    
    results.total = results.futureEntries + results.oldEntries + results.expiredEntries;
    
    // Get updated statistics
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_entries,
        MIN(event_date) as oldest_entry,
        MAX(event_date) as newest_entry,
        pg_size_pretty(pg_total_relation_size('digest_entries')) as table_size
      FROM digest_entries
    `);
    
    const typeStats = await pool.query(`
      SELECT source_type, COUNT(*) as count, 
             MIN(event_date) as oldest,
             MAX(event_date) as newest
      FROM digest_entries
      GROUP BY source_type
      ORDER BY count DESC
    `);
    
    console.log('✅ Cleanup complete!');
    
    res.json({
      success: true,
      message: `Cleaned up ${results.total} entries`,
      removed: results,
      currentState: {
        totalEntries: parseInt(stats.rows[0].total_entries),
        oldestEntry: stats.rows[0].oldest_entry,
        newestEntry: stats.rows[0].newest_entry,
        tableSize: stats.rows[0].table_size,
        byType: typeStats.rows
      }
    });
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Cleanup failed'
    });
  }
});

/**
 * Get data quality report
 * GET /api/digest/quality-report
 */
router.get('/quality-report', async (req, res) => {
  try {
    const now = new Date();
    const oneYearAgo = new Date(Date.now() - (365 * 24 * 60 * 60 * 1000));
    const oneDayFromNow = new Date(Date.now() + (24 * 60 * 60 * 1000));
    
    // Check for problematic dates
    const [futureEntries, oldEntries, expiredEntries] = await Promise.all([
      pool.query(`
        SELECT source_type, COUNT(*) as count, 
               MIN(event_date) as earliest,
               MAX(event_date) as latest
        FROM digest_entries
        WHERE event_date > $1
        GROUP BY source_type
      `, [oneDayFromNow]),
      
      pool.query(`
        SELECT source_type, COUNT(*) as count,
               MIN(event_date) as earliest,
               MAX(event_date) as latest
        FROM digest_entries
        WHERE event_date < $1
        GROUP BY source_type
      `, [oneYearAgo]),
      
      pool.query(`
        SELECT source_type, COUNT(*) as count
        FROM digest_entries
        WHERE expires_at < NOW()
        GROUP BY source_type
      `)
    ]);
    
    // Overall stats
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_entries,
        MIN(event_date) as oldest_entry,
        MAX(event_date) as newest_entry,
        COUNT(CASE WHEN event_date > $1 THEN 1 END) as future_count,
        COUNT(CASE WHEN event_date < $2 THEN 1 END) as old_count,
        COUNT(CASE WHEN expires_at < NOW() THEN 1 END) as expired_count
      FROM digest_entries
    `, [oneDayFromNow, oneYearAgo]);
    
    const issues = {
      futureEntries: futureEntries.rows,
      oldEntries: oldEntries.rows,
      expiredEntries: expiredEntries.rows
    };
    
    const hasIssues = 
      (futureEntries.rowCount || 0) > 0 || 
      (oldEntries.rowCount || 0) > 0 || 
      (expiredEntries.rowCount || 0) > 0;
    
    res.json({
      success: true,
      dataQuality: hasIssues ? 'needs_cleanup' : 'good',
      stats: stats.rows[0],
      issues,
      recommendation: hasIssues 
        ? 'Run POST /api/digest/cleanup to remove problematic entries'
        : 'Data quality is good, no cleanup needed'
    });
    
  } catch (error) {
    console.error('❌ Quality report failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Report generation failed'
    });
  }
});

/**
 * Get server time and timezone info
 * GET /api/digest/server-time
 */
router.get('/server-time', (req, res) => {
  const now = new Date();
  res.json({
    serverTime: now.toISOString(),
    serverTimeLocal: now.toString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timestamp: now.getTime(),
    unixSeconds: Math.floor(now.getTime() / 1000),
    nodeEnv: process.env.NODE_ENV,
    checks: {
      oneYearAgo: new Date(Date.now() - (365 * 24 * 60 * 60 * 1000)).toISOString(),
      oneDayFromNow: new Date(Date.now() + (24 * 60 * 60 * 1000)).toISOString()
    }
  });
});

export default router;
