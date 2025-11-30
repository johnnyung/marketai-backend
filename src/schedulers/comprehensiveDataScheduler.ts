import cron from 'node-cron';
import comprehensiveDataEngine from '../services/comprehensiveDataEngine.js';
import correlationHunterService from '../services/correlationHunterService.js';
import jobManager from '../services/jobManagerService.js';

class ComprehensiveDataScheduler {
  private tasks: cron.ScheduledTask[] = [];
  private isRunning = false;

  start() {
    if (this.isRunning) return;
    
    console.log('⏰ Scheduler Active');

    // 4:00 AM EST - Full Market Scan
    const morningJob = cron.schedule('0 4 * * *', async () => {
        console.log('🌅 Running 4AM Market Prep...');
        // Use Job Manager to safely trigger
        try {
            jobManager.startJob('ANALYSIS', 'Scheduled: 4AM Scan');
            await comprehensiveDataEngine.runComprehensiveCollection();
            jobManager.completeJob('ANALYSIS', 'Scheduled Scan Complete');
        } catch (e) { /* Job likely already running */ }
    }, { timezone: "America/New_York" });

    // 4:30 AM EST - Correlation Lab
    const correlationJob = cron.schedule('30 4 * * *', async () => {
        console.log('🔬 Running 4:30AM Correlation Scan...');
        try {
            jobManager.startJob('CORRELATION', 'Scheduled: Correlation Scan');
            await correlationHunterService.runAnalysis();
            jobManager.completeJob('CORRELATION', 'Scheduled Scan Complete');
        } catch (e) { /* Job likely already running */ }
    }, { timezone: "America/New_York" });

    this.tasks.push(morningJob, correlationJob);
    this.isRunning = true;
  }

  stop() {
    console.log('🛑 Stopping Scheduler...');
    this.tasks.forEach(task => task.stop());
    this.tasks = [];
    this.isRunning = false;
  }

  getStatus() {
    return {
        running: this.isRunning,
        jobCount: this.tasks.length,
        nextRuns: '4:00 AM EST, 4:30 AM EST'
    };
  }

  async forceRun(type: string) {
      console.log(`⚡ Force Running: ${type}`);
      if (type === 'analysis' || type === 'all') {
          await comprehensiveDataEngine.runComprehensiveCollection();
      }
      if (type === 'correlation') {
          await correlationHunterService.runAnalysis();
      }
  }
}

export default new ComprehensiveDataScheduler();
