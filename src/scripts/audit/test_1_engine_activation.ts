import 'dotenv/config';
import gammaExposureService from '../../services/gammaExposureService.js';
import insiderIntentService from '../../services/insiderIntentService.js';
import narrativePressureService from '../../services/narrativePressureService.js';
import currencyShockService from '../../services/currencyShockService.js';
import divergenceDetectorService from '../../services/divergenceDetectorService.js';
import multiAgentValidationService from '../../services/multiAgentValidationService.js';
import marketSentimentService from '../../services/marketSentimentService.js';
import shadowLiquidityService from '../../services/shadowLiquidityService.js';
import regimeTransitionService from '../../services/regimeTransitionService.js';

const TICKER = 'AAPL';

async function run() {
    console.log("🔥 TEST 1: ENGINE ACTIVATION (v101-v110)...");
    try {
        const results = await Promise.all([
            gammaExposureService.analyze(TICKER).then(r => r ? 'OK' : 'FAIL'),
            insiderIntentService.analyzeIntent(TICKER).then(r => r ? 'OK' : 'FAIL'),
            narrativePressureService.calculatePressure(TICKER).then(r => r ? 'OK' : 'FAIL'),
            currencyShockService.analyzeShock().then(r => r ? 'OK' : 'FAIL'),
            divergenceDetectorService.analyzeFractals(TICKER).then(r => r ? 'OK' : 'FAIL'),
            multiAgentValidationService.validate(TICKER).then(r => r ? 'OK' : 'FAIL'),
            marketSentimentService.getThermometer().then(r => r ? 'OK' : 'FAIL'),
            shadowLiquidityService.scanShadows(TICKER).then(r => r ? 'OK' : 'FAIL'),
            regimeTransitionService.detectRegime().then(r => r ? 'OK' : 'FAIL')
        ]);
        
        const engines = ['Gamma', 'Insider', 'Narrative', 'Currency', 'Divergence', 'MultiAgent', 'Sentiment', 'Shadow', 'Regime'];
        let passed = true;
        
        results.forEach((res, i) => {
            const icon = res === 'OK' ? '✅' : '❌';
            console.log(`   ${icon} ${engines[i]}: ${res}`);
            if (res !== 'OK') passed = false;
        });

        process.exit(passed ? 0 : 1);
    } catch (e: any) {
        console.error("   ❌ FATAL ERROR:", e.message);
        process.exit(1);
    }
}
run();
