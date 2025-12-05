import 'dotenv/config';
import predictionLoggerService from '../services/predictionLoggerService.js';
import predictionReviewService from '../services/predictionReviewService.js';
import pool from '../db/index.js';

async function test() {
    console.log("🧪 TESTING PREDICTION REVIEW ENGINE...");

    // 1. Create a mock pending prediction
    // We'll use a price we know is likely to be hit (or simulate it)
    // For test reliability, we'll insert a "Winner" based on AAPL being > $1
    const id = await predictionLoggerService.logPrediction({
        ticker: 'AAPL', // Always has price > $1
        confidence: 99,
        entry_primary: 1, // Super low entry to force a "Win"
        stop_loss: 0.5,
        take_profit_1: 5, // Current price > 5, so this should trigger WIN
        take_profit_2: 10,
        take_profit_3: 15,
        agent_signals: { test: true }
    });

    if (!id) throw new Error("Setup failed: Could not log prediction");
    console.log(`   ✅ Created Test Prediction (ID: ${id})`);

    // 2. Run Review
    await predictionReviewService.runReviewCycle();

    // 3. Verify Outcome
    const res = await pool.query("SELECT * FROM prediction_results WHERE id = $1", [id]);
    const result = res.rows[0];

    if (result.result_outcome === 'WIN') {
        console.log(`   ✅ Grading Verified: Outcome is WIN`);
        console.log(`      PnL: ${result.performance_pnl}%`);
        console.log(`      TP1 Hit: ${result.hit_take_profit_1}`);
    } else {
        console.error(`   ❌ Grading Failed: Outcome is ${result.result_outcome} (Expected WIN)`);
        console.log(result);
        process.exit(1);
    }

    // Cleanup
    await pool.query("DELETE FROM prediction_results WHERE id = $1", [id]);
    process.exit(0);
}

test();
