import { Pool } from 'pg';
import axios from 'axios';
import dotenv from 'dotenv';

// --- INGESTION SERVICES ---
import marketDataService from '../services/marketDataService.js';
import fmpService from '../services/fmpService.js';
import tiingoService from '../services/tiingoService.js';
import yahooFinanceService from '../services/yahooFinanceService.js';
import secEdgarService from '../services/secEdgarService.js';
import newsAggregatorService from '../services/newsAggregatorService.js';
import redditService from '../services/redditService.js';

// --- DEEP BRAIN ENGINES ---
import gammaExposureService from '../services/gammaExposureService.js';
import insiderIntentService from '../services/insiderIntentService.js';
import narrativePressureService from '../services/narrativePressureService.js';
import currencyShockService from '../services/currencyShockService.js';
import divergenceDetectorService from '../services/divergenceDetectorService.js';
import multiAgentValidationService from '../services/multiAgentValidationService.js';
import marketSentimentService from '../services/marketSentimentService.js';
import shadowLiquidityService from '../services/shadowLiquidityService.js';
import regimeTransitionService from '../services/regimeTransitionService.js';
import catalystHunterService from '../services/catalystHunterService.js';
import crossSignalConsensusEngine from '../services/crossSignalConsensusEngine.js';
import tribunalService from '../services/tribunalService.js';

// --- FSI & EXECUTION ---
import financialHealthService from '../services/financialHealthService.js';
import tradeArchitectService from '../services/tradeArchitectService.js';
import riskConstraintService from '../services/riskConstraintService.js';
import tradingOpportunitiesService from '../services/tradingOpportunitiesService.js';
import sectorDiscoveryService from '../services/sectorDiscoveryService.js';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const BASE_URL = process.env.MARKETAI_BACKEND_URL || 'http://localhost:3001';
const AUDIT_TOKEN = process.env.AUDIT_MODE_SECRET || 'marketai-audit-bypass-key-2025';
const TEST_TICKER = 'NVDA';

// --- UTILS ---
const log = (msg: string, type: 'INFO' | 'PASS' | 'FAIL' | 'WARN' = 'INFO') => {
    const icons = { INFO: 'ℹ️', PASS: '✅', FAIL: '❌', WARN: '⚠️' };
    console.log(`${icons[type]}  ${msg}`);
};

const check = (condition: boolean, name: string) => {
    if (condition) log(`${name}: Passed`, 'PASS');
    else {
        log(`${name}: FAILED`, 'FAIL');
        globalFailures++;
    }
};

let globalFailures = 0;

async function runFullSystemValidation() {
    console.log(`\n🚀 STARTING MARKET_AI FULL SYSTEM VALIDATION (v113.0-FSI)\n`);
    console.log(`   Target: ${BASE_URL}`);
    
    try {
        await runPartA_Ingestion();
        await runPartB_DeepBrain();
        await runPartC_FSI();
        await runPartD_ExecutionAgent();
        await runPartE_DailyPicks();
        await runPartF_BackendRoutes();
        await runPartG_Database();

        console.log("\n========================================================");
        if (globalFailures === 0) {
            console.log("✅ SYSTEM STATUS: GREEN. ALL SYSTEMS OPERATIONAL.");
        } else {
            console.log(`❌ SYSTEM STATUS: RED. ${globalFailures} CRITICAL FAILURES DETECTED.`);
        }
        console.log("========================================================");
    } catch (e: any) {
        console.error("🚨 CRITICAL SCRIPT FAILURE:", e);
    } finally {
        await pool.end();
        process.exit(globalFailures > 0 ? 1 : 0);
    }
}

// ------------------------------------------------------------------------------
// PART A: INGESTION CORTEX
// ------------------------------------------------------------------------------
async function runPartA_Ingestion() {
    console.log("\n📡 PART A: INGESTION CORTEX VALIDATION");
    
    try {
        const fmp = await fmpService.getPrice(TEST_TICKER);
        check(!!fmp && fmp.price > 0, "FMP Data Feed");

        const yahoo = await yahooFinanceService.getPrice(TEST_TICKER);
        check(!!yahoo && yahoo.price > 0, "Yahoo Finance Fallback");

        const mesh = await marketDataService.getStockPrice(TEST_TICKER);
        check(!!mesh && mesh.source !== undefined, "Market Data Mesh Router");
    
        const universe = await sectorDiscoveryService.getExpandedUniverse();
        check(universe.length > 50, `Wide-Net Universe Size (${universe.length} tickers)`);

        const news = await newsAggregatorService.getRecentNews(1);
        check(news.length > 0, "News Aggregator");
    } catch (e: any) { log(`Ingestion Logic Error: ${e.message}`, 'FAIL'); globalFailures++; }
}

// ------------------------------------------------------------------------------
// PART B: DEEP BRAIN
// ------------------------------------------------------------------------------
async function runPartB_DeepBrain() {
    console.log("\n🧠 PART B: DEEP BRAIN ENGINE DIAGNOSTICS");

    try {
        const [gamma, insider, narrative, shock, div, agents, sentiment, shadow, regime] = await Promise.all([
            gammaExposureService.analyze(TEST_TICKER),
            insiderIntentService.analyzeIntent(TEST_TICKER),
            narrativePressureService.calculatePressure(TEST_TICKER),
            currencyShockService.analyzeShock(),
            divergenceDetectorService.analyzeFractals(TEST_TICKER),
            multiAgentValidationService.validate(TEST_TICKER),
            marketSentimentService.getThermometer(),
            shadowLiquidityService.scanShadows(TEST_TICKER),
            regimeTransitionService.detectRegime()
        ]);

        check(gamma.volatility_regime !== undefined, "Gamma Exposure Engine");
        check(insider.classification !== undefined, "Insider Intent Engine");
        check(narrative.pressure_score !== undefined, "Narrative Pressure Engine");
        check(shock.shock_level !== undefined, "Currency Shock Engine");
        check(div.has_divergence !== undefined, "Fractal Divergence Engine");
        check(agents.consensus !== undefined, "Multi-Agent Consensus");
        check(sentiment.score !== undefined, "Market Sentiment Thermometer");
        check(shadow.shadow_volume_ratio !== undefined, "Shadow Liquidity Engine");
        check(regime.current_regime !== undefined, "Regime Transition Engine");

        const verdict = await tribunalService.conductTrial(TEST_TICKER);
        check(verdict.final_verdict !== undefined, "Tribunal Adversarial System");

    } catch (e: any) {
        log(`Deep Brain Crash: ${e.message}`, 'FAIL');
        globalFailures++;
    }
}

// ------------------------------------------------------------------------------
// PART C: FINANCIAL STATEMENTS INTELLIGENCE (FSI)
// ------------------------------------------------------------------------------
async function runPartC_FSI() {
    console.log("\n🛡️  PART C: FSI LAYER VALIDATION");

    try {
        const health = await financialHealthService.analyze(TEST_TICKER);
        
        check(health.quality_score !== undefined, "Quality Score Calculation");
        check(health.earnings_risk_score !== undefined, "Earnings Risk Calculation");
        check(['GREEN', 'YELLOW', 'RED'].includes(health.traffic_light), "Traffic Light Logic");
        check(!!health.metrics.profitability, "Profitability Metrics");
        
    } catch (e: any) {
        log(`FSI Layer Error: ${e.message}`, 'FAIL');
        globalFailures++;
    }
}

// ------------------------------------------------------------------------------
// PART D: EXECUTION AGENT (PHFA)
// ------------------------------------------------------------------------------
async function runPartD_ExecutionAgent() {
    console.log("\n⚙️  PART D: EXECUTION AGENT (PHFA) VALIDATION");

    try {
        const price = 150.00;
        const mockEngines = {
            gamma: { volatility_regime: 'AMPLIFIED' },
            shadow: { bias: 'ACCUMULATION' },
            narrative: { pressure_score: 85 },
            catalyst: { has_catalyst: true, catalyst_event: 'Earnings' }
        };

        // FIXED: Added await
        const plan = await tradeArchitectService.constructPlan(
            TEST_TICKER,
            price,
            85, // Confidence
            'High', // Vol Profile
            'explosive_growth', // Tier
            mockEngines
        );

        check(plan.entry_primary === price, "Primary Entry Logic");
        check(plan.stop_loss < price, "Stop Loss Logic");
        check(plan.take_profit_1 > price, "Take Profit Logic");
        check(plan.allocation_percent > 0, "Position Sizing Logic");
        check(plan.if_then_map.length > 0, "If/Then Decision Map Generation");
        check(!!plan.advanced_explanation, "Advanced Rationale Generation");
        
    } catch (e: any) {
        log(`Execution Agent Error: ${e.message}`, 'FAIL');
        globalFailures++;
    }
}

// ------------------------------------------------------------------------------
// PART E: DAILY PICKS SIMULATION
// ------------------------------------------------------------------------------
async function runPartE_DailyPicks() {
    console.log("\n💡 PART E: DAILY PICKS GENERATION TEST");
    try {
        const signals = await tradingOpportunitiesService.generateTradingSignals(3);
        check(signals.length > 0, "Signal Generator Output");
    } catch (e: any) {
        log(`Daily Picks Error: ${e.message}`, 'FAIL');
        globalFailures++;
    }
}

// ------------------------------------------------------------------------------
// PART F: BACKEND ROUTE TESTS
// ------------------------------------------------------------------------------
async function runPartF_BackendRoutes() {
    console.log("\n🌐 PART F: API ENDPOINT CONNECTIVITY");
    
    const routes = [
        '/api/system/health',
        '/api/dashboard/status',
        '/api/ai-tips/active',
        '/api/gamma/analyze/AAPL',
        '/api/insider/intent/AAPL',
        '/api/narrative/pressure/AAPL',
        '/api/currency/shock',
        '/api/divergence/analyze/AAPL',
        '/api/sentiment/thermometer',
        '/api/shadow/scan/AAPL',
        '/api/regime/current',
        '/api/fundamentals/health/AAPL' // FSI CHECK
    ];

    for (const route of routes) {
        try {
            const res = await axios.get(`${BASE_URL}${route}`, {
                timeout: 5000,
                headers: { 'Authorization': `Bearer ${AUDIT_TOKEN}` }
            });
            if (res.status === 200) {
                check(true, `Route ${route}`);
            } else {
                log(`Route ${route} returned ${res.status}`, 'FAIL');
                globalFailures++;
            }
        } catch (e: any) {
            log(`Route ${route} unreachable: ${e.message}`, 'FAIL');
            globalFailures++;
        }
    }
}

// ------------------------------------------------------------------------------
// PART G: DATABASE SCHEMA
// ------------------------------------------------------------------------------
async function runPartG_Database() {
    console.log("\n💾 PART G: DATABASE SCHEMA CHECK");
    const tables = [
        'ai_stock_tips', 'trades', 'digest_entries', 'historical_events',
        'gamma_snapshots', 'narrative_pressure_logs', 'insider_intent_logs',
        'currency_shocks', 'divergence_signals', 'regime_snapshots',
        'shadow_liquidity_prints', 'financial_health_snapshots'
    ];

    for (const table of tables) {
        try {
            const res = await pool.query(`SELECT to_regclass($1) as exists`, [table]);
            check(!!res.rows[0].exists, `Table: ${table}`);
        } catch(e) {
            log(`Missing Table ${table}`, 'FAIL');
            globalFailures++;
        }
    }
}

runFullSystemValidation();
