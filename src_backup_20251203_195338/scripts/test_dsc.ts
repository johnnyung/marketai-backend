import 'dotenv/config';
import tradeArchitectService from '../services/tradeArchitectService.js';
import drawdownSensitivityService from '../services/drawdownSensitivityService.js';

async function test() {
    console.log("🧪 TESTING DSC (Drawdown Sensitivity)...");

    // 1. Test Profile Fetch
    const cryptoProfile = await drawdownSensitivityService.getRiskProfile('crypto_alpha');
    const blueProfile = await drawdownSensitivityService.getRiskProfile('blue_chip');

    console.log(`   Crypto Modifier: ${cryptoProfile.stop_loss_modifier}x (Should be > 1.0)`);
    console.log(`   BlueChip Modifier: ${blueProfile.stop_loss_modifier}x (Should be 1.0)`);

    if (cryptoProfile.stop_loss_modifier <= 1.0) {
        console.error("❌ Failed: Crypto should have widened stops.");
        process.exit(1);
    }

    // 2. Test Plan Generation
    console.log("\n   🏗️  Generating Trade Plan for BTC (High Vol)...");
    const plan = await tradeArchitectService.constructPlan(
        'BTC-USD', 50000, 90, 'High', 'crypto_alpha', {}
    );
    
    const dist = 50000 - plan.stop_loss;
    const pct = (dist / 50000) * 100;
    
    console.log(`      Stop Loss: $${plan.stop_loss} (-${pct.toFixed(2)}%)`);
    
    // Standard vol (0.08) * Crypto Mod (1.5) ~= 12%
    if (pct < 10) {
        console.error("❌ Failed: Stop loss too tight for Crypto Alpha.");
        process.exit(1);
    }

    console.log("   ✅ DSC Logic Verified.");
    process.exit(0);
}

test();
