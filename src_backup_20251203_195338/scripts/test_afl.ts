import 'dotenv/config';
import accuracyFeedbackService from '../services/accuracyFeedbackService.js';

async function test() {
    console.log("🧪 TESTING ACCURACY FEEDBACK LOOP (AFL)...");
    
    // 1. Fetch current weights (Should be defaults or learned)
    const weights = await accuracyFeedbackService.getWeights();
    console.log(`   Current Weights (Sample):`);
    console.log(`      ACE: ${weights.ace}`);
    console.log(`      GNAE: ${weights.gnae}`);
    console.log(`      DVE: ${weights.dve}`);

    // 2. Simulate a winning trade
    console.log(`\n   🏆 Simulating WIN on AAPL (GNAE & DVE voted)...`);
    await accuracyFeedbackService.processTradeOutcome('AAPL', 10.5, ['gnae', 'dve']);

    // 3. Verify weight update
    const newWeights = await accuracyFeedbackService.getWeights();
    console.log(`   Updated Weights:`);
    console.log(`      GNAE: ${newWeights.gnae} (Should be > ${weights.gnae})`);
    console.log(`      DVE: ${newWeights.dve} (Should be > ${weights.dve})`);

    if (newWeights.gnae > weights.gnae) {
        console.log("\n   ✅ AFL Learning Logic Validated.");
        process.exit(0);
    } else {
        console.error("\n   ❌ AFL Failed to update weights.");
        process.exit(1);
    }
}

test();
