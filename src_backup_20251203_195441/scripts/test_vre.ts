import 'dotenv/config';
import volatilityRegimeEngine from '../services/volatilityRegimeEngine.js';

async function test() {
    console.log("🧪 TESTING VOLATILITY REGIME ENGINE (VRE)...");
    
    // Test with mock data first
    // 5% daily moves (High Vol)
    const highVolHistory = [100, 105, 100, 95, 100, 106, 99];
    const highResult = await volatilityRegimeEngine.analyze('TEST_HIGH', highVolHistory);
    console.log(`\nCase High Vol: ${highResult.regime}`);
    console.log(`   - Stop Mult: ${highResult.adaptations.stop_loss_multiplier}`);
    console.log(`   - Size Mult: ${highResult.adaptations.position_size_multiplier}`);

    // 0.5% daily moves (Low Vol)
    const lowVolHistory = [100, 100.5, 100.2, 100.7, 100.4];
    const lowResult = await volatilityRegimeEngine.analyze('TEST_LOW', lowVolHistory);
    console.log(`\nCase Low Vol: ${lowResult.regime}`);
    console.log(`   - Stop Mult: ${lowResult.adaptations.stop_loss_multiplier}`);
    console.log(`   - Size Mult: ${lowResult.adaptations.position_size_multiplier}`);

    process.exit(0);
}

test();
