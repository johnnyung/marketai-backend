import 'dotenv/config';
import crossAssetRiskService from '../services/crossAssetRiskService.js';

async function test() {
    console.log("🧪 TESTING CROSS-ASSET RISK MONITOR (CARM)...");

    const carm = await crossAssetRiskService.analyzeSystemicRisk();
    
    console.log(`   📉 Risk Score: ${carm.risk_score}/100`);
    console.log(`   🚦 Regime: ${carm.regime}`);
    console.log(`   🛡️  Confidence Penalty: -${carm.confidence_penalty}`);

    if (carm.drivers.length > 0) {
        console.log("   ⚠️  Active Drivers:");
        carm.drivers.forEach(d => console.log(`      - ${d}`));
    } else {
        console.log("   ✅ No Active Stress Drivers.");
    }
    
    process.exit(0);
}

test();
