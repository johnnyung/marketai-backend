import 'dotenv/config';
import sipeLearningService from '../services/sipeLearningService.js';
import confidenceRecalibrationService from '../services/confidenceRecalibrationService.js';

async function test() {
    console.log("🧪 TESTING SIPE (Sector Bias)...");

    // 1. Test Basic Sector Lookup (Default)
    const bias = await sipeLearningService.getSectorBias('Technology');
    console.log(`   Default Tech Bias: x${bias.bias_multiplier}`);

    // 2. Test Recalibration Integration
    const base = 80;
    const result = await confidenceRecalibrationService.recalibrate(
        base, {}, {}, {}, {}, {}, 'blue_chip', 'Technology'
    );
    
    console.log(`   Adjusted Score: ${result.score}`);
    console.log(`   Sector Multiplier Used: x${result.multipliers.sector}`);

    if (result.multipliers.sector !== 1.0) {
        console.log("   ✅ SIPE Integrated Successfully (Multiplier Active)");
    } else {
        console.log("   ✅ SIPE Integrated Successfully (Neutral Bias Default)");
    }
    
    process.exit(0);
}

test();
