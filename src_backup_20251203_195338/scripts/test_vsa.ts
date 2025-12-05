import 'dotenv/config';
import tradeArchitectService from '../services/tradeArchitectService.js';
import volatilityShockAwarenessService from '../services/volatilityShockAwarenessService.js';

async function test() {
    console.log("🧪 TESTING VSA (Volatility Shock Awareness)...");

    // 1. Get Current VSA State
    const vsa = await volatilityShockAwarenessService.getMarketCondition();
    console.log(`   Current VIX: ${vsa.vix_level} (${vsa.regime})`);
    console.log(`   Stop Modifier: ${vsa.stop_width_modifier}x`);

    // 2. Test Architect Integration
    console.log("\n   🏗️  Generating Trade Plan with VSA...");
    
    // Force High VSA for test
    const mockVSA = { regime: 'HIGH', stop_width_modifier: 1.5, confidence_modifier: 0.8 };
    
    const plan = await tradeArchitectService.constructPlan(
        'SPY', 500, 90, 'Low', 'blue_chip',
        { vsa: mockVSA } // Inject High VSA
    );
    
    const dist = 500 - plan.stop_loss;
    const pct = (dist / 500) * 100;
    
    console.log(`      Stop Loss: $${plan.stop_loss} (-${pct.toFixed(2)}%)`);
    console.log(`      Reason: ${plan.advanced_explanation}`);

    // Base vol (0.02 for Low) * 1.5 (VSA) = 3%
    if (pct < 2.5) {
        console.error("❌ Failed: Stop loss did not widen correctly for High Vol.");
        process.exit(1);
    }

    console.log("   ✅ VSA Logic Verified.");
    process.exit(0);
}

test();
