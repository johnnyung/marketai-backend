import tickerUniverseService from '../services/tickerUniverseService.js';
import unifiedIntelligenceFactory from '../services/unifiedIntelligenceFactory.js';
import portfolioIntelligenceEngine from '../services/portfolioIntelligenceEngine.js';
import fmpService from '../services/fmpService.js';
import metaCortexService from '../services/metaCortexService.js';

// ANSI Colors
const C = {
    Reset: "\x1b[0m",
    Red: "\x1b[31m",
    Green: "\x1b[32m",
    Yellow: "\x1b[33m",
    Blue: "\x1b[34m",
    Cyan: "\x1b[36m"
};

const LOG = (step: string, msg: string, status: 'PASS' | 'FAIL' | 'INFO') => {
    const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : 'ℹ️';
    const color = status === 'PASS' ? C.Green : status === 'FAIL' ? C.Red : C.Cyan;
    console.log(`${color}[${step}] ${icon} ${msg}${C.Reset}`);
};

async function runFullDiagnostics() {
    console.log(`\n${C.Blue}=== MARKET_AI v113.0 E2E SYSTEM VALIDATION ===${C.Reset}\n`);
    
    let failures = 0;
    const TEST_TICKER = 'AAPL';

    // -------------------------------------------------------------------------
    // STEP 1: INGESTION LAYER
    // -------------------------------------------------------------------------
    console.log(`${C.Yellow}--- STEP 1: INGESTION CORTEX ---${C.Reset}`);
    
    try {
        // Universe Check
        const universe = await tickerUniverseService.getUniverse();
        if (universe.length >= 8) {
            LOG('INGESTION', `Wide-Net Universe Active (${universe.length} tickers)`, 'PASS');
        } else {
            LOG('INGESTION', `Universe too small (${universe.length})`, 'FAIL');
            failures++;
        }

        // Data Source Check (FMP)
        try {
            const profile = await fmpService.getCompanyProfile(TEST_TICKER);
            if (profile && profile.symbol === TEST_TICKER) {
                LOG('INGESTION', 'FMP Connection Active', 'PASS');
            } else {
                throw new Error('Profile missing');
            }
        } catch (e) {
            LOG('INGESTION', 'FMP Connection Failed (Fallback mode active?)', 'INFO');
        }

    } catch (e) {
        LOG('INGESTION', `Critical Ingestion Error: ${e}`, 'FAIL');
        failures++;
    }

    // -------------------------------------------------------------------------
    // STEP 2: DEEP BRAIN & FSI (Single Ticker)
    // -------------------------------------------------------------------------
    console.log(`\n${C.Yellow}--- STEP 2: DEEP BRAIN & FSI (${TEST_TICKER}) ---${C.Reset}`);
    
    try {
        const bundle = await unifiedIntelligenceFactory.generateBundle(TEST_TICKER);
        
        // FSI Validation
        if (bundle.engines.fsi && typeof bundle.engines.fsi.score === 'number') {
            LOG('FSI', `Quality Score: ${bundle.engines.fsi.score}`, 'PASS');
            LOG('FSI', `Traffic Light: ${bundle.engines.fsi.traffic_light}`, 'PASS');
        } else {
            LOG('FSI', 'Missing Financial Health Data', 'FAIL');
            failures++;
        }

        // Deep Brain Validation
        const engines = bundle.engines;
        if (engines.narrative && engines.insider && engines.gamma) {
            LOG('DEEP_BRAIN', `Narrative: ${engines.narrative.score} | Insider: ${engines.insider.score}`, 'PASS');
        } else {
            LOG('DEEP_BRAIN', 'Missing Engine Outputs', 'FAIL');
            failures++;
        }

        // PHFA Validation
        const plan = bundle.trade_plan;
        if (plan && plan.entry_primary > 0 && plan.stop_loss > 0) {
            LOG('PHFA', `Trade Plan Valid (Entry: $${plan.entry_primary}, Stop: $${plan.stop_loss})`, 'PASS');
            LOG('PHFA', `Time Horizon: ${plan.time_horizon}`, 'PASS');
        } else {
            LOG('PHFA', 'Trade Plan Incomplete or Zeroed', 'FAIL');
            failures++;
        }

    } catch (e) {
        LOG('DEEP_BRAIN', `Generation Crash: ${e}`, 'FAIL');
        failures++;
    }

    // -------------------------------------------------------------------------
    // STEP 3: TOP 3 ENDPOINT SIMULATION
    // -------------------------------------------------------------------------
    console.log(`\n${C.Yellow}--- STEP 3: DAILY TOP 3 PIPELINE ---${C.Reset}`);
    
    try {
        const start = Date.now();
        const top3 = await unifiedIntelligenceFactory.generateDailyTop3();
        const duration = (Date.now() - start) / 1000;

        if (top3 && top3.length > 0) {
            LOG('TOP_3', `Generated ${top3.length} picks in ${duration.toFixed(2)}s`, 'PASS');
            const winner = top3[0];
            console.log(`      🏆 #1 Pick: ${winner.ticker} (Conf: ${winner.scoring.weighted_confidence})`);
            
            // Check Data Integrity of Result
            if (!winner.trade_plan) {
                LOG('TOP_3', 'Winner missing Trade Plan', 'FAIL');
                failures++;
            }
        } else {
            LOG('TOP_3', 'Returned Empty Array', 'FAIL');
            failures++;
        }

    } catch (e) {
        LOG('TOP_3', `Pipeline Crash: ${e}`, 'FAIL');
        failures++;
    }

    // -------------------------------------------------------------------------
    // STEP 4: PORTFOLIO ANALYZER
    // -------------------------------------------------------------------------
    console.log(`\n${C.Yellow}--- STEP 4: PORTFOLIO INTELLIGENCE ---${C.Reset}`);
    
    try {
        const analysis = await portfolioIntelligenceEngine.analyzePortfolio(1);
        
        if (analysis && analysis.positions.length > 0) {
            LOG('PORTFOLIO', `Analyzed ${analysis.positions.length} holdings`, 'PASS');
            LOG('PORTFOLIO', `Risk Level: ${analysis.portfolio_metrics.risk_level}`, 'PASS');
            
            const firstPos = analysis.positions[0];
            if (firstPos.intelligence && firstPos.recommendation) {
                LOG('PORTFOLIO', `Deep Analysis Present for ${firstPos.ticker}`, 'PASS');
            } else {
                LOG('PORTFOLIO', 'Missing Deep Intelligence in Holding', 'FAIL');
                failures++;
            }
        } else {
            LOG('PORTFOLIO', 'Analysis failed or returned empty', 'FAIL');
            failures++;
        }

    } catch (e) {
        LOG('PORTFOLIO', `Engine Crash: ${e}`, 'FAIL');
        failures++;
    }

    // -------------------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------------------
    console.log(`\n${C.Blue}=== DIAGNOSTIC SUMMARY ===${C.Reset}`);
    if (failures === 0) {
        console.log(`${C.Green}✅ SYSTEM GREEN. ALL SYSTEMS GO.${C.Reset}`);
        process.exit(0);
    } else {
        console.log(`${C.Red}❌ SYSTEM DEGRADED. ${failures} FAILURES DETECTED.${C.Reset}`);
        process.exit(1);
    }
}

runFullDiagnostics();
