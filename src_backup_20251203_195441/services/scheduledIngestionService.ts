// src/services/scheduledIngestionService.ts
// Scheduled data ingestion - runs daily

import * as cron from 'node-cron';
import edgarService from './edgarService.js';

class ScheduledIngestionService {
  private job: cron.ScheduledTask | null = null;

  /**
   * Start the scheduled ingestion service
   */
  start() {
    // Run daily at 7 AM UTC (2 AM EST / 11 PM PST)
    this.job = cron.schedule('0 7 * * *', async () => {
      console.log('\n📊 Running scheduled data ingestion...');
      await this.runIngestion();
    });

    console.log('✓ Scheduled ingestion service started (daily 7 AM UTC)');
    
    // Run once on startup
    setTimeout(() => this.runIngestion(), 5000);
  }

  /**
   * Run all ingestion tasks
   */
  async runIngestion() {
    const startTime = Date.now();

    try {
      // SEC EDGAR filings (IPOs, SPACs)
      console.log('📋 Ingesting SEC EDGAR filings...');
      const edgarResult = await edgarService.ingestFilings();
      console.log(`  ${edgarResult.success ? '✓' : '✗'} ${edgarResult.message}`);

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`✓ Ingestion complete in ${duration}s\n`);

    } catch (error) {
      console.error('❌ Ingestion failed:', error);
    }
  }

  /**
   * Stop the scheduled service
   */
  stop() {
    if (this.job) {
      this.job.stop();
      console.log('✓ Scheduled ingestion service stopped');
    }
  }

  /**
   * Trigger ingestion manually
   */
  async triggerNow() {
    console.log('🔄 Manual ingestion triggered');
    await this.runIngestion();
  }

  /**
   * Alias for compatibility
   */
  async triggerManual() {
    return this.triggerNow();
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      running: this.job !== null,
      schedule: '0 7 * * *',
      description: 'Daily at 7 AM UTC'
    };
  }
}

export default new ScheduledIngestionService();
