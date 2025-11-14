// src/schedulers/calendarScheduler.ts
import * as cron from 'node-cron';
import economicCalendarService from '../services/economicCalendarService.js';

class CalendarScheduler {
  private job: cron.ScheduledTask | null = null;

  start() {
    // Run daily at 6 AM UTC (1 AM EST / 10 PM PST)
    this.job = cron.schedule('0 6 * * *', async () => {
      console.log('📅 Running scheduled economic calendar update...');
      try {
        const result = await economicCalendarService.fetchAndStoreEvents();
        console.log(`✅ Calendar update: ${result.message}`);
      } catch (error) {
        console.error('❌ Calendar update failed:', error);
      }
    });

    console.log('📅 Economic calendar scheduler started (daily 6 AM UTC)');
    
    // Run immediately on startup
    this.runNow();
  }

  async runNow() {
    console.log('📅 Running economic calendar update now...');
    const result = await economicCalendarService.fetchAndStoreEvents();
    console.log(`  ${result.success ? '✅' : '❌'} ${result.message}`);
  }

  stop() {
    if (this.job) {
      this.job.stop();
      console.log('📅 Calendar scheduler stopped');
    }
  }
}

export default new CalendarScheduler();
