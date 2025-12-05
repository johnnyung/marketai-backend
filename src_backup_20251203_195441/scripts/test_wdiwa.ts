import 'dotenv/config';
import wdiwaAttributionService from '../services/wdiwaAttributionService.js';
import confidenceRecalibrationService from '../services/confidenceRecalibrationService.js';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function test() {
    console.log("🧪 TESTING WDIWA (Attribution Optimizer)...");

    // 1. Seed Mock Wins
    // 5 Wins where Shadow Liquidity was the ONLY active signal
    // This should train WDIWA to boost 'shadow' weight
    console.log("   🌱 Seeding Mock Wins for Shadow Liquidity...");
    
    for(let i=0; i<6; i++) {
        await pool.query(`
            INSERT INTO prediction_results (ticker, result_outcome, performance_pnl, date_predicted, agent_signals)
            VALUES ($1, 'WIN', 10, NOW(), $2)
        `, [`WDIWA_TEST_${i}`, JSON.stringify({
            shadow: { bias: 'ACCUMULATION' }, // The Hero
            momentum: { verdict: 'NEUTRAL' },
            value: { verdict: 'NEUTRAL' }
        })]);
    }

    // 2. Run Learning Cycle
    await wdiwaAttributionService.runAttributionCycle();

    // 3. Verify Weights
    const weights = await wdiwaAttributionService.getEngineWeights();
    console.log(`   Shadow Weight: x${weights.shadow}`);
    console.log(`   Momentum Weight: x${weights.momentum}`);

    if (weights.shadow > 1.0 && weights.momentum <= 1.0) {
        console.log("   ✅ WDIWA Logic Verified: Shadow engine boosted based on win attribution.");
    } else {
        console.error("   ❌ WDIWA Failed: Weights did not adapt to winning signal.");
        process.exit(1);
    }

    // 4. Verify Recalibration Usage
    const recal = await confidenceRecalibrationService.recalibrate(
        80, {}, {}, {}, { bias: 'ACCUMULATION' }, {}, 'blue_chip', 'General'
    );
    
    if (recal.score > 80) {
        console.log(`   ✅ Recalibration Verified: Score boosted to ${recal.score}`);
    } else {
        console.warn(`   ⚠️ Score not boosted (${recal.score}), check multiplier logic.`);
    }

    // Cleanup
    await pool.query("DELETE FROM prediction_results WHERE ticker LIKE 'WDIWA_TEST%'");
    process.exit(0);
}

test();
