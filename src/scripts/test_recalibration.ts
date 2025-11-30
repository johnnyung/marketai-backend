import 'dotenv/config';
import confidenceRecalibrationService from '../services/confidenceRecalibrationService.js';

async function test() {
    console.log("🧪 TESTING RECALIBRATION ENGINE...");

    const base = 80;
    
    // SCENARIO 1: ALL GREEN (Should Boost)
    const boost = await confidenceRecalibrationService.recalibrate(
        base,
        { momentum: { verdict: 'BULL' } }, // Agents (Simulated)
        { traffic_light: 'GREEN' },        // FSI
        { pressure_score: 85 },            // Narrative
        { bias: 'ACCUMULATION' },          // Shadow
        { current_regime: 'RISK_ON' }      // Regime
    );
    
    console.log(`   Scenario 1 (Perfect): ${base} -> ${boost.score}`);
    if (boost.score <= base) { console.error("❌ Failed to boost perfect setup"); process.exit(1); }

    // SCENARIO 2: ALL RED (Should Crush)
    const crush = await confidenceRecalibrationService.recalibrate(
        base,
        { momentum: { verdict: 'BEAR' } },
        { traffic_light: 'RED' },
        { pressure_score: 10 },
        { bias: 'DISTRIBUTION' },
        { current_regime: 'RISK_OFF' }
    );

    console.log(`   Scenario 2 (Toxic): ${base} -> ${crush.score}`);
    if (crush.score >= base) { console.error("❌ Failed to penalize toxic setup"); process.exit(1); }

    console.log("   ✅ Recalibration Logic Verified.");
    process.exit(0);
}

test();
