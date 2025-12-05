import 'dotenv/config';
import globalMacroForecastService from '../services/globalMacroForecastService.js';
import macroRegimeService from '../services/macroRegimeService.js';

async function test() {
    console.log("🧪 TESTING GLOBAL MACRO FORECAST (GMF)...");

    const forecast = await globalMacroForecastService.generateForecast();
    console.log(`   📊 Macro Health: ${forecast.health_score}/100`);
    console.log(`   🔥 Inflation: ${forecast.inflation.trend}`);
    console.log(`   📈 Growth: ${forecast.growth.trend}`);
    console.log(`   💧 Liquidity: ${forecast.liquidity.trend}`);
    console.log(`   📝 Summary: ${forecast.summary}`);

    // Verify Regime Engine Consumption
    console.log("\n   🔄 Verifying Regime Integration...");
    const regime = await macroRegimeService.getRegime();
    console.log(`   -> Regime Output: ${regime.regime} (${regime.bias})`);
    
    if (regime.indicators.gmf_score !== undefined) {
        console.log("   ✅ GMF Integration Verified.");
        process.exit(0);
    } else {
        console.error("   ❌ Regime Engine ignored GMF data.");
        process.exit(1);
    }
}

test();
