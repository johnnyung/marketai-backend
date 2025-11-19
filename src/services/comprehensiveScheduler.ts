// src/services/comprehensiveScheduler.ts
import cron from 'node-cron';
import intelligentDigestService from './intelligentDigestService.js';

class ComprehensiveScheduler {
  private jobs: Map<string, cron.ScheduledTask> = new Map();

  start() {
    console.log('📅 Starting comprehensive data collection scheduler...');

    // Every 30 minutes - Full digest ingestion
    this.jobs.set('digest', cron.schedule('*/30 * * * *', async () => {
      await this.collectDigest();
    }));

    console.log('✅ Scheduler active:');
    console.log('   - Full Digest: Every 30 min');
  }

  private async collectDigest() {
    try {
      console.log('🔄 Running scheduled digest ingestion...');
      const result = await intelligentDigestService.ingestAndStore();
      console.log(`✅ Digest: ${result.stored} entries stored`);
    } catch (error) {
      console.error('❌ Scheduled digest failed:', error);
    }
  }

  stop() {
    console.log('🛑 Stopping scheduler...');
    this.jobs.forEach((job, name) => {
      job.stop();
      console.log(`  Stopped: ${name}`);
    });
    this.jobs.clear();
  }
}

export default new ComprehensiveScheduler();
