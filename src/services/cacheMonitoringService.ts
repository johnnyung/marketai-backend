import { pool } from "../db/index.js";
// backend/src/services/cacheMonitoringService.ts
// Cache Performance Monitoring and Cleanup

import { Pool } from 'pg';


interface CacheStats {
  cacheType: string;
  hits: number;
  misses: number;
  hitRate: number;
  apiCallsSaved: number;
  costSavedDollars: number;
  date: Date;
}

class CacheMonitoringService {
  
  /**
   * Get today's cache statistics
   */
  async getTodayStats(): Promise<CacheStats[]> {
    const result = await pool.query(`
      SELECT 
        cache_type,
        hits,
        misses,
        CASE 
          WHEN (hits + misses) > 0 THEN ROUND((hits::numeric / (hits + misses)) * 100, 2)
          ELSE 0 
        END as hit_rate,
        api_calls_saved,
        cost_saved_dollars,
        date
      FROM cache_statistics
      WHERE date = CURRENT_DATE
      ORDER BY cost_saved_dollars DESC
    `);
    
    return result.rows.map(row => ({
      cacheType: row.cache_type,
      hits: row.hits,
      misses: row.misses,
      hitRate: parseFloat(row.hit_rate),
      apiCallsSaved: row.api_calls_saved,
      costSavedDollars: parseFloat(row.cost_saved_dollars),
      date: row.date
    }));
  }

  /**
   * Get cache statistics for date range
   */
  async getStatsRange(startDate: Date, endDate: Date): Promise<CacheStats[]> {
    const result = await pool.query(`
      SELECT 
        cache_type,
        SUM(hits) as hits,
        SUM(misses) as misses,
        CASE 
          WHEN SUM(hits + misses) > 0 THEN ROUND((SUM(hits)::numeric / SUM(hits + misses)) * 100, 2)
          ELSE 0 
        END as hit_rate,
        SUM(api_calls_saved) as api_calls_saved,
        SUM(cost_saved_dollars) as cost_saved_dollars,
        date
      FROM cache_statistics
      WHERE date >= $1 AND date <= $2
      GROUP BY cache_type, date
      ORDER BY date DESC, cost_saved_dollars DESC
    `, [startDate, endDate]);
    
    return result.rows.map(row => ({
      cacheType: row.cache_type,
      hits: row.hits,
      misses: row.misses,
      hitRate: parseFloat(row.hit_rate),
      apiCallsSaved: row.api_calls_saved,
      costSavedDollars: parseFloat(row.cost_saved_dollars),
      date: row.date
    }));
  }

  /**
   * Get total savings summary
   */
  async getTotalSavings(): Promise<any> {
    const result = await pool.query(`
      SELECT 
        SUM(api_calls_saved) as total_calls_saved,
        SUM(cost_saved_dollars) as total_cost_saved,
        AVG(CASE 
          WHEN (hits + misses) > 0 THEN (hits::numeric / (hits + misses)) * 100
          ELSE 0 
        END) as avg_hit_rate
      FROM cache_statistics
      WHERE date >= CURRENT_DATE - INTERVAL '30 days'
    `);
    
    return {
      totalCallsSaved: result.rows[0].total_calls_saved || 0,
      totalCostSaved: parseFloat(result.rows[0].total_cost_saved || 0),
      avgHitRate: parseFloat(result.rows[0].avg_hit_rate || 0)
    };
  }

  /**
   * Cleanup old cached data
   */
  async cleanupOldCache(daysToKeep: number = 7): Promise<any> {
    console.log(`🧹 Cleaning up cache older than ${daysToKeep} days...`);
    
    const results: any = {};
    
    // Deep Dive
    const deepDive = await pool.query(`
      DELETE FROM deep_dive_cache 
      WHERE created_date < CURRENT_DATE - INTERVAL '${daysToKeep} days'
      RETURNING id
    `);
    results.deepDiveDeleted = deepDive.rowCount;
    
    // Pattern Watch
    const patterns = await pool.query(`
      DELETE FROM pattern_watch_cache 
      WHERE created_date < CURRENT_DATE - INTERVAL '${daysToKeep} days'
      RETURNING id
    `);
    results.patternsDeleted = patterns.rowCount;
    
    // Risk Monitor
    const risks = await pool.query(`
      DELETE FROM risk_monitor_cache 
      WHERE created_date < CURRENT_DATE - INTERVAL '${daysToKeep} days'
      RETURNING id
    `);
    results.risksDeleted = risks.rowCount;
    
    // Vetting
    const vetting = await pool.query(`
      DELETE FROM ticker_vetting_cache 
      WHERE created_date < CURRENT_DATE - INTERVAL '${daysToKeep} days'
      RETURNING id
    `);
    results.vettingDeleted = vetting.rowCount;
    
    // Executive Summary
    const summary = await pool.query(`
      DELETE FROM executive_summary_cache 
      WHERE created_date < CURRENT_DATE - INTERVAL '${daysToKeep} days'
      RETURNING id
    `);
    results.summaryDeleted = summary.rowCount;
    
    // Trading Signals
    const signals = await pool.query(`
      DELETE FROM trading_signals_cache 
      WHERE created_date < CURRENT_DATE - INTERVAL '${daysToKeep} days'
      RETURNING id
    `);
    results.signalsDeleted = signals.rowCount;
    
    // Old stats (keep 30 days)
    const stats = await pool.query(`
      DELETE FROM cache_statistics 
      WHERE date < CURRENT_DATE - INTERVAL '30 days'
      RETURNING id
    `);
    results.statsDeleted = stats.rowCount;
    
    console.log('🧹 Cleanup complete:', results);
    return results;
  }

  /**
   * Get cache sizes
   */
  async getCacheSizes(): Promise<any> {
    const result = await pool.query(`
      SELECT 
        'deep_dive' as cache_type,
        COUNT(*) as entries,
        pg_total_relation_size('deep_dive_cache') as bytes
      FROM deep_dive_cache
      WHERE created_date >= CURRENT_DATE - INTERVAL '7 days'
      
      UNION ALL
      
      SELECT 
        'pattern_watch',
        COUNT(*),
        pg_total_relation_size('pattern_watch_cache')
      FROM pattern_watch_cache
      WHERE created_date >= CURRENT_DATE - INTERVAL '7 days'
      
      UNION ALL
      
      SELECT 
        'risk_monitor',
        COUNT(*),
        pg_total_relation_size('risk_monitor_cache')
      FROM risk_monitor_cache
      WHERE created_date >= CURRENT_DATE - INTERVAL '7 days'
      
      UNION ALL
      
      SELECT 
        'vetting',
        COUNT(*),
        pg_total_relation_size('ticker_vetting_cache')
      FROM ticker_vetting_cache
      WHERE created_date >= CURRENT_DATE - INTERVAL '7 days'
      
      UNION ALL
      
      SELECT 
        'executive_summary',
        COUNT(*),
        pg_total_relation_size('executive_summary_cache')
      FROM executive_summary_cache
      WHERE created_date >= CURRENT_DATE - INTERVAL '7 days'
    `);
    
    return result.rows.map(row => ({
      cacheType: row.cache_type,
      entries: row.entries,
      sizeMB: (row.bytes / (1024 * 1024)).toFixed(2)
    }));
  }

  /**
   * Clear all cache (for testing)
   */
  async clearAllCache(): Promise<void> {
    console.log('⚠️ Clearing ALL cache...');
    
    await pool.query('TRUNCATE TABLE deep_dive_cache');
    await pool.query('TRUNCATE TABLE pattern_watch_cache');
    await pool.query('TRUNCATE TABLE risk_monitor_cache');
    await pool.query('TRUNCATE TABLE ticker_vetting_cache');
    await pool.query('TRUNCATE TABLE executive_summary_cache');
    await pool.query('TRUNCATE TABLE trading_signals_cache');
    
    console.log('✅ All cache cleared');
  }
}

export default new CacheMonitoringService();
