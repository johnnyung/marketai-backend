import 'dotenv/config';
import confidenceDriftService from '../services/confidenceDriftService.js';
import { pool } from '../db/index.js';

async function test() {
    console.log("🧪 TESTING CDC (Confidence Drift)...");

    // 1. Mock some history
    await pool.query(`
        INSERT INTO prediction_results (ticker, result_outcome, confidence_at_prediction, date_predicted)
        VALUES ('CDC_TEST', 'WIN', 70, NOW() - INTERVAL '2 days')
    `);

    // 2. Run Calibration
    await confidenceDriftService.runCalibrationCycle();

    // 3. Check Factor
    const metrics = await confidenceDriftService.getDriftCorrection();
    console.log(`   Factor: x${metrics.correction_factor.toFixed(3)} | Bias: ${metrics.drift_bias.toFixed(1)} | Status: ${metrics.status}`);

    if (metrics.correction_factor > 0.5 && metrics.correction_factor < 1.5) {
        console.log("   ✅ CDC Logic Verified (Factor within bounds).");
    } else {
        console.error("   ❌ CDC Factor Out of Bounds.");
        process.exit(1);
    }

    // Cleanup
    await pool.query("DELETE FROM prediction_results WHERE ticker = 'CDC_TEST'");
    process.exit(0);
}

test();
