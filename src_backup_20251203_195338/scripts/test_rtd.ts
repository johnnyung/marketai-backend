import 'dotenv/config';
import tradeArchitectService from '../services/tradeArchitectService.js';
import reversalTrapService from '../services/reversalTrapService.js';

async function test() {
    console.log("🧪 TESTING RTD (Reversal Trap Detector)...");

    // 1. Test Known Trap Ticker (TSLA)
    const rtd = await reversalTrapService.analyzeTrapRisk('TSLA', 'HIGH');
    console.log(`   TSLA Risk: ${rtd.reversal_risk_score} (Trap: ${rtd.is_trap_zone})`);
    console.log(`   Buffer Rec: ${rtd.recommended_buffer}%`);

    if (!rtd.is_trap_zone) {
        console.error("❌ Failed: TSLA should be a trap zone in HIGH vol.");
        process.exit(1);
    }

    // 2. Test Architect Integration
    console.log("\n   🏗️  Generating Trade Plan for TSLA...");
    
    const plan = await tradeArchitectService.constructPlan(
        'TSLA', 200, 85, 'High', 'explosive_growth', 
        { rtd: rtd } // Inject RTD Data
    );
    
    const stopDist = 200 - plan.stop_loss;
    const pct = (stopDist / 200) * 100;
    
    console.log(`      Stop Loss: $${plan.stop_loss} (-${pct.toFixed(2)}%)`);
    console.log(`      Reason: ${plan.advanced_explanation}`);

    // Base vol (8%) + Buffer (4.5% * 1.2) should be > 12%
    if (pct < 12) {
        console.error("❌ Failed: Stop loss did not widen for Trap Risk.");
        process.exit(1);
    }

    console.log("   ✅ RTD Logic Verified.");
    process.exit(0);
}

test();
