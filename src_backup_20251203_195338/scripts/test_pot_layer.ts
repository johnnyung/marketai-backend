import 'dotenv/config';
import predictionLoggerService from '../services/predictionLoggerService.js';

async function run() {
    console.log("🧪 Testing POT Layer...");

    // 1. LOG PREDICTION
    const id = await predictionLoggerService.logPrediction({
        ticker: 'TEST_POT',
        confidence: 88,
        entry_primary: 100,
        stop_loss: 95,
        take_profit_1: 110,
        take_profit_2: 120,
        take_profit_3: 130,
        agent_signals: { gamma: 'bullish', insider: 'buying' }
    });

    if (!id) {
        console.error("❌ Failed to log prediction.");
        process.exit(1);
    }

    console.log(`   ✅ Prediction Logged (ID: ${id})`);

    // 2. UPDATE OUTCOME
    await predictionLoggerService.saveOutcome({
        id,
        outcome: 'WIN',
        pnl: 10.5,
        days_held: 5,
        mfe: 112, // Max Fav
        mae: 98,  // Max Adverse
        hit_tp1: true,
        hit_sl: false
    });

    console.log("   ✅ Outcome Updated.");
    process.exit(0);
}

run();
