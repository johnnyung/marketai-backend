// backend/src/services/scheduledIngestionService.ts
// Scheduled Auto-Ingestion - Runs every N hours to keep digest fresh

import cron, { ScheduledTask } from 'node-cron';
import intelligentDigestService from './intelligentDigestService.js';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

class ScheduledIngestionService {
  private isRunning = false;
  private lastRun: Date | null = null;
  private nextRun: Date | null = null;
  private cronJob: ScheduledTask | null = null;
  
  // Configuration
  private readonly INGESTION_SCHEDULE = '0 */6 * * *'; // Every 6 hours (0:00, 6:00, 12:00, 18:00)
  private readonly CLEANUP_SCHEDULE = '0 2 * * *'; // Daily at 2 AM UTC
  
  /**
   * Start the scheduled ingestion service
   */
  start() {
    console.log('🔄 Starting Scheduled Ingestion Service...');
    
    // Schedule ingestion every 6 hours
    this.cronJob = cron.schedule(this.INGESTION_SCHEDULE, async () => {
      await this.runScheduledIngestion();
    }, {
      timezone: 'UTC'
    });
    
    // Schedule daily cleanup at 2 AM UTC
    cron.schedule(this.CLEANUP_SCHEDULE, async () => {
      await this.runScheduledCleanup();
    }, {
      timezone: 'UTC'
    });
    
    this.calculateNextRun();
    
    console.log(`✅ Scheduled Ingestion: Every 6 hours`);
    console.log(`✅ Scheduled Cleanup: Daily at 2 AM UTC`);
    console.log(`⏰ Next ingestion: ${this.nextRun?.toISOString()}`);
    
    // Run immediately on startup (optional - comment out if you don't want this)
    // this.runScheduledIngestion();
  }
  
  /**
   * Stop the scheduled service
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      console.log('⏸️ Scheduled Ingestion Service stopped');
    }
  }
  
  /**
   * Run scheduled ingestion
   */
  private async runScheduledIngestion() {
    if (this.isRunning) {
      console.log('⚠️ Ingestion already running, skipping...');
      return;
    }
    
    this.isRunning = true;
    console.log('\n🔄 === SCHEDULED INGESTION STARTED ===');
    console.log(`📅 Time: ${new Date().toISOString()}`);
    
    try {
      // Step 1: Ingest new data
      console.log('\n📥 Step 1: Ingesting new data...');
      const result = await intelligentDigestService.ingestAndStore();
      
      console.log(`✅ Ingestion complete:`);
      console.log(`   • Collected: ${result.collected}`);
      console.log(`   • Stored: ${result.stored} new entries`);
      console.log(`   • Duplicates: ${result.duplicates}`);
      
      // Step 2: Clean up expired entries
      console.log('\n🧹 Step 2: Cleaning expired entries...');
      const cleanupResult = await this.cleanupExpiredEntries();
      console.log(`✅ Removed ${cleanupResult.removed} expired entries`);
      
      // Step 3: Get current stats
      const stats = await this.getDigestStats();
      console.log('\n📊 Current Digest Stats:');
      console.log(`   • Total entries: ${stats.totalEntries}`);
      console.log(`   • Avg relevance: ${stats.avgRelevance}`);
      console.log(`   • Database size: ${stats.dbSize}`);
      
      this.lastRun = new Date();
      this.calculateNextRun();
      
      console.log('\n✅ === SCHEDULED INGESTION COMPLETE ===\n');
      
    } catch (error) {
      console.error('❌ Scheduled ingestion failed:', error);
    } finally {
      this.isRunning = false;
    }
  }
  
  /**
   * Run scheduled cleanup
   */
  private async runScheduledCleanup() {
    console.log('\n🧹 === SCHEDULED CLEANUP STARTED ===');
    console.log(`📅 Time: ${new Date().toISOString()}`);
    
    try {
      // Remove expired entries
      const expiredResult = await this.cleanupExpiredEntries();
      console.log(`✅ Removed ${expiredResult.removed} expired entries`);
      
      // Remove low-quality entries (relevance < 30)
      const lowQualityResult = await this.cleanupLowQualityEntries();
      console.log(`✅ Removed ${lowQualityResult.removed} low-quality entries`);
      
      // Remove very old entries (older than retention period + 30 days buffer)
      const oldResult = await this.cleanupVeryOldEntries();
      console.log(`✅ Removed ${oldResult.removed} very old entries`);
      
      const total = expiredResult.removed + lowQualityResult.removed + oldResult.removed;
      console.log(`\n✅ Total cleaned: ${total} entries`);
      
      console.log('✅ === SCHEDULED CLEANUP COMPLETE ===\n');
      
    } catch (error) {
      console.error('❌ Scheduled cleanup failed:', error);
    }
  }
  
  /**
   * Clean up expired entries
   */
  private async cleanupExpiredEntries() {
    const result = await pool.query(`
      DELETE FROM digest_entries
      WHERE expires_at < NOW()
      RETURNING id
    `);
    
    return { removed: result.rowCount || 0 };
  }
  
  /**
   * Clean up low-quality entries (relevance < 30)
   * These add noise without value
   */
  private async cleanupLowQualityEntries() {
    const result = await pool.query(`
      DELETE FROM digest_entries
      WHERE ai_relevance_score < 30
      AND event_date < NOW() - INTERVAL '7 days'
      RETURNING id
    `);
    
    return { removed: result.rowCount || 0 };
  }
  
  /**
   * Clean up very old entries that somehow escaped expiration
   */
  private async cleanupVeryOldEntries() {
    const result = await pool.query(`
      DELETE FROM digest_entries
      WHERE event_date < NOW() - INTERVAL '400 days'
      RETURNING id
    `);
    
    return { removed: result.rowCount || 0 };
  }
  
  /**
   * Get current digest statistics
   */
  private async getDigestStats() {
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_entries,
        ROUND(AVG(ai_relevance_score)::numeric, 0) as avg_relevance,
        pg_size_pretty(pg_total_relation_size('digest_entries')) as db_size
      FROM digest_entries
    `);
    
    return {
      totalEntries: parseInt(stats.rows[0].total_entries),
      avgRelevance: parseInt(stats.rows[0].avg_relevance),
      dbSize: stats.rows[0].db_size
    };
  }
  
  /**
   * Calculate next run time
   */
  private calculateNextRun() {
    const now = new Date();
    const nextHour = new Date(now);
    
    // Next run is at the next 0, 6, 12, or 18 hour mark
    const currentHour = now.getUTCHours();
    const hoursUntilNext = 6 - (currentHour % 6);
    
    nextHour.setUTCHours(currentHour + hoursUntilNext);
    nextHour.setUTCMinutes(0);
    nextHour.setUTCSeconds(0);
    nextHour.setUTCMilliseconds(0);
    
    this.nextRun = nextHour;
  }
  
  /**
   * Get service status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun?.toISOString() || null,
      nextRun: this.nextRun?.toISOString() || null,
      schedule: 'Every 6 hours (0:00, 6:00, 12:00, 18:00 UTC)',
      cleanupSchedule: 'Daily at 2:00 AM UTC'
    };
  }
  
  /**
   * Manually trigger ingestion (for testing)
   */
  async triggerManual() {
    console.log('🔄 Manual ingestion triggered');
    await this.runScheduledIngestion();
  }
}

export default new ScheduledIngestionService();
