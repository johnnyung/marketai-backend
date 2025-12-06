import 'dotenv/config';
import agentReliabilityService from '../services/agentReliabilityService.js';
import { pool } from '../db/index.js';

async function test() {
    console.log("🧪 TESTING AGENT RELIABILITY ENGINE...");

    // 1. Seed Mock Data (15 Trades)
    // 10 Wins for Momentum, 10 Losses for Value
    console.log("   🌱 Seeding Mock History...");
    
    for (let i = 0; i < 15; i++) {
        const isWin = i < 10; // First 10 are wins
        const outcome = isWin ? 'WIN' : 'LOSS';
        const pnl = isWin ? 10 : -5;
        
        const signals = {
            momentum: { verdict: 'BULL' }, // Always Bullish (High Win Rate)
            value: { verdict: isWin ? 'NEUTRAL' : 'BULL' } // Bullish mainly on losses (Low Win Rate)
        };

        await pool.query(`
            INSERT INTO prediction_results (ticker, result_outcome, performance_pnl, agent_signals, date_predicted)
            VALUES ($1, $2, $3, $4, NOW() - INTERVAL '1 day')
        `, [`TEST_${i}`, outcome, pnl, JSON.stringify(signals)]);
    }

    // 2. Run Analysis
    await agentReliabilityService.runReliabilityAnalysis(2);

    // 3. Verify Multipliers
    const momRes = await pool.query("SELECT * FROM agent_reliability_snapshots WHERE agent_name = 'Momentum' AND snapshot_date = CURRENT_DATE");
    const valRes = await pool.query("SELECT * FROM agent_reliability_snapshots WHERE agent_name = 'Value' AND snapshot_date = CURRENT_DATE");

    const momMult = parseFloat(momRes.rows[0].reliability_multiplier);
    const valMult = parseFloat(valRes.rows[0].reliability_multiplier);

    if (momMult > 1.0 && valMult < 1.0) {
        console.log(`   ✅ Logic Verified: Momentum (${momMult}) > Value (${valMult})`);
    } else {
        console.error(`   ❌ Logic Failed: Momentum (${momMult}) vs Value (${valMult})`);
        process.exit(1);
    }

    // Cleanup
    await pool.query("DELETE FROM prediction_results WHERE ticker LIKE 'TEST_%'");
    await pool.query("DELETE FROM agent_reliability_snapshots WHERE snapshot_date = CURRENT_DATE");
    
    process.exit(0);
}

test();
