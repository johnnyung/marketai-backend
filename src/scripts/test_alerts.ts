import 'dotenv/config';
import autonomousAlertService from '../services/autonomousAlertService.js';

async function test() {
    console.log("🧪 TESTING ALERT ENGINE...");

    // 1. Create Mock Alert
    await autonomousAlertService.createAlert('PERFORMANCE_DIP', 'HIGH', 'Test Anomaly Detected', { z_score: -2.5 });

    // 2. Fetch Alerts
    const alerts = await autonomousAlertService.getRecentAlerts();
    console.log(`   Found ${alerts.length} alerts.`);

    const found = alerts.some(a => a.message === 'Test Anomaly Detected');
    if (found) {
        console.log("   ✅ Alert creation & retrieval verified.");
        process.exit(0);
    } else {
        console.error("   ❌ Failed to retrieve created alert.");
        process.exit(1);
    }
}

test();
