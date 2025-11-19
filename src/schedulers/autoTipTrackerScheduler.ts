/**
 * SCHEDULED AUTO TIP TRACKER
 * Runs every 6 hours to auto-track all new AI recommendations
 */

import cron from 'node-cron';
import autoTipTrackerOrchestrator from '../services/autoTipTrackerOrchestrator.js';

export function initializeAutoTipTracker() {
  console.log('🎯 Initializing Auto Tip Tracker Scheduler...');
  
  // Run every 6 hours: 00:00, 06:00, 12:00, 18:00 UTC
  cron.schedule('0 */6 * * *', async () => {
    console.log('\n🎯 SCHEDULED AUTO TIP TRACKER: Running...');
    
    try {
      await autoTipTrackerOrchestrator.trackAllSources();
      console.log('✅ Scheduled auto-tracking complete\n');
    } catch (error) {
      console.error('❌ Scheduled auto-tracking failed:', error);
    }
  }, {
    timezone: 'UTC'
  });
  
  console.log('  ✅ Auto Tip Tracker scheduled: Every 6 hours');
  console.log('  ⏰ Next run times: 00:00, 06:00, 12:00, 18:00 UTC');
  
  // Run once on startup (after 30 seconds delay)
  setTimeout(async () => {
    console.log('\n🎯 STARTUP AUTO TIP TRACKER: Running initial scan...');
    try {
      await autoTipTrackerOrchestrator.trackAllSources();
    } catch (error) {
      console.error('Startup auto-tracking failed:', error);
    }
  }, 30000);
}
