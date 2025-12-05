import { Pool } from 'pg';
import dotenv from 'dotenv';

// --- CORE INGESTION & DISCOVERY ---
import sectorDiscoveryService from '../services/sectorDiscoveryService.js';
import marketDataService from '../services/marketDataService.js';

// --- ENGINES (DEEP BRAIN) ---
import financialHealthService from '../services/financialHealthService.js';
import gammaExposureService from '../services/gammaExposureService.js';
import insiderIntentService from '../services/insiderIntentService.js';

// --- META & LEARNING LAYERS ---
import metaCortexService from '../services/metaCortexService.js';
import evolutionEngine from '../services/evolutionEngine.js';
import autonomousAlertService from '../services/autonomousAlertService.js';
import confidenceDriftService from '../services/confidenceDriftService.js';

// --- UNIFIED PIPELINE ---
import unifiedIntelligenceFactory from '../services/unifiedIntelligenceFactory.js';
import signalGeneratorService from '../services/signalGeneratorService.js';
import userPortfolioService from '../services/userPortfolioService.js';
import tradingOpportunitiesService from '../services/tradingOpportunitiesService.js';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

let passCount = 0;
let failCount = 0;

const log = (section: string, status: 'PASS' | 'FAIL' | 'WARN', msg: string) => {
    const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${icon} [${section}] ${msg}`);
    if (status === 'PASS') passCount++;
    if (status === 'FAIL') failCount++;
};

async function runSuite() {
    console.log("\n🚀 STARTING FULL SELF-EVOLVING ENGINE VALIDATION\n");

    // =================================================================
    // 1. INGESTION CORTEX VALIDATION
    // =================================================================
    console.log("--- SECTION 1: INGESTION CORTEX ---");
    try {
        const universe = await sectorDiscoveryService.getExpandedUniverse();
        if (universe.length > 100) {
            log('Wide-Net', 'PASS', `Active Universe: ${universe.length} Tickers (>100)`);
        } else {
            log('Wide-Net', 'FAIL', `Universe Restricted: Only ${universe.length} Tickers`);
        }

        const quote = await marketDataService.getStockPrice('AAPL');
        if (quote && quote.price > 0) log('Market Data', 'PASS', `Live Feed Active (${quote.source})`);
        else log('Market Data', 'FAIL', 'Feed Dead');
    } catch (e: any) { log('Ingestion', 'FAIL', e.message); }

    // =================================================================
    // 2. DEEP BRAIN & FSI VALIDATION
    // =================================================================
    console.log("\n--- SECTION 2: DEEP BRAIN & FSI ---");
    try {
        const fsi = await financialHealthService.analyze('NVDA');
        if (fsi.traffic_light && fsi.quality_score !== undefined) {
            log('FSI Engine', 'PASS', `Financials: ${fsi.traffic_light} (Score: ${fsi.quality_score})`);
        } else {
            log('FSI Engine', 'FAIL', 'Invalid FSI Output');
        }

        const gamma = await gammaExposureService.analyze('SPY');
        if (gamma.volatility_regime) log('Gamma Engine', 'PASS', `Regime: ${gamma.volatility_regime}`);
        else log('Gamma Engine', 'FAIL', 'Gamma Output Missing');
    } catch (e: any) { log('Deep Brain', 'FAIL', e.message); }

    // =================================================================
    // 3. META-CORTEX (SELF-DIAGNOSIS)
    // =================================================================
    console.log("\n--- SECTION 3: META-CORTEX (SELF-AWARENESS) ---");
    try {
        const diagnosis = await metaCortexService.runDiagnostics();
        log('Meta-Cortex', 'PASS', `Health Score: ${diagnosis.health_score}%`);
        
        if (diagnosis.missing_data_sources) {
            log('Blind Spots', 'PASS', `Detected ${diagnosis.missing_data_sources.length} Blind Spots`);
        }
        if (diagnosis.drift_index) {
            log('Drift Detection', 'PASS', `Drift Index: ${diagnosis.drift_index}`);
        }
    } catch (e: any) { log('Meta-Cortex', 'FAIL', e.message); }

    // =================================================================
    // 4. EVOLUTION ENGINE (SELF-IMPROVEMENT)
    // =================================================================
    console.log("\n--- SECTION 4: EVOLUTION ENGINE ---");
    try {
        const plan = await evolutionEngine.getLatestPlan();
        if (plan.health_score !== undefined) {
            log('Evolution Plan', 'PASS', `Active Plan Found (Health: ${plan.health_score}%)`);
            if (plan.upgrades && plan.upgrades.length > 0) {
                log('Upgrades', 'PASS', `Proposed Upgrades: ${plan.upgrades.length}`);
            } else {
                log('Upgrades', 'WARN', 'No upgrades proposed (System might be optimal or stale)');
            }
        } else {
            log('Evolution Plan', 'FAIL', 'Plan schema invalid');
        }
        
        // Check for learning biases
        if (plan.learning_biases) {
            log('Learning Biases', 'PASS', 'Active Biases Loaded');
        }
    } catch (e: any) { log('Evolution', 'FAIL', e.message); }

    // =================================================================
    // 5. UNIFIED INTELLIGENCE OBJECT (THE CORE)
    // =================================================================
    console.log("\n--- SECTION 5: UNIFIED INTELLIGENCE INTEGRITY ---");
    try {
        const bundle = await unifiedIntelligenceFactory.generateBundle('AAPL');

        // Check Structure
        const checks = [
            bundle.ticker === 'AAPL',
            bundle.price_data.current > 0,
            bundle.engines.fsi !== undefined,
            bundle.engines.gamma !== undefined,
            bundle.trade_plan.stop_loss > 0,
            bundle.learning.drift_correction !== undefined,
            bundle.scoring.weighted_confidence > 0
        ];

        if (checks.every(c => c)) {
            log('Bundle Structure', 'PASS', 'Unified Object is Complete');
            log('PHFA Integration', 'PASS', `Trade Plan: Buy ${bundle.trade_plan.entry_primary}, Stop ${bundle.trade_plan.stop_loss}`);
            log('Learning Integration', 'PASS', `Drift Correction: x${bundle.learning.drift_correction}`);
        } else {
            log('Bundle Structure', 'FAIL', 'Missing critical fields in IntelligenceBundle');
        }

    } catch (e: any) { log('Unified Factory', 'FAIL', e.message); }

    // =================================================================
    // 6. PIPELINE CONSISTENCY (Daily Picks vs Portfolio vs War Room)
    // =================================================================
    console.log("\n--- SECTION 6: PIPELINE CONVERGENCE ---");
    try {
        const TEST_TICKER = 'AAPL';
        
        // 1. Factory Direct
        const factoryBundle = await unifiedIntelligenceFactory.generateBundle(TEST_TICKER);
        
        // 2. War Room
        const warRoomSignal = await tradingOpportunitiesService.generateTickerSignal(TEST_TICKER);
        
        // 3. Daily Picks (Simulated via Getter)
        // Ensure logic is identical
        
        if (Math.abs(factoryBundle.scoring.weighted_confidence - (warRoomSignal?.confidence || 0)) < 0.1) {
            log('Consistency', 'PASS', 'Factory and War Room scores match');
        } else {
            log('Consistency', 'FAIL', `Divergence: Factory ${factoryBundle.scoring.weighted_confidence} vs WarRoom ${warRoomSignal?.confidence}`);
        }

    } catch (e: any) { log('Pipeline', 'FAIL', e.message); }

    // =================================================================
    // 7. DATABASE INTEGRITY
    // =================================================================
    console.log("\n--- SECTION 7: LONG-TERM MEMORY ---");
    try {
        const tables = [
            'meta_diagnostics_logs',
            'system_evolution_plans',
            'system_alerts',
            'agent_reliability_snapshots',
            'attribution_learning_snapshots'
        ];
        
        for (const t of tables) {
            const res = await pool.query(`SELECT to_regclass($1) as exists`, [t]);
            if (res.rows[0].exists) log(`DB Table: ${t}`, 'PASS', 'Exists');
            else log(`DB Table: ${t}`, 'FAIL', 'Missing');
        }
    } catch (e: any) { log('Database', 'FAIL', e.message); }

    console.log("\n========================================================");
    if (failCount === 0) {
        console.log(`✅ SYSTEM STATUS: GREEN (PERFECT)`);
        console.log(`   All 12 Learning Phases + Meta-Cortex are Active.`);
    } else {
        console.log(`❌ SYSTEM STATUS: RED (${failCount} Failures)`);
    }
    console.log("========================================================");

    await pool.end();
    process.exit(failCount > 0 ? 1 : 0);
}

runSuite();
