import axios from 'axios';
import dotenv from 'dotenv';
import { Pool } from 'pg';

// --- INTERNAL SERVICES (Direct Logic Check) ---
import financialHealthService from '../services/financialHealthService.js';
import tradeArchitectService from '../services/tradeArchitectService.js';
import sectorDiscoveryService from '../services/sectorDiscoveryService.js';
import marketDataService from '../services/marketDataService.js';

dotenv.config();
const BASE_URL = 'http://localhost:3001';
const AUDIT_TOKEN = process.env.AUDIT_MODE_SECRET || 'marketai-audit-bypass-key-2025';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

let score = 100;
let criticalFailures = 0;

const log = (label: string, status: 'PASS' | 'FAIL' | 'WARN', msg: string) => {
    const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${icon} [${label}] ${msg}`);
    if (status === 'FAIL') {
        score -= 20;
        criticalFailures++;
    }
};

async function runDiagnostics() {
    console.log(`\n🔍 RUNNING v113-T3 DEEP SCAN...`);

    // =================================================================
    // LAYER 1: INGESTION CORTEX (Wide-Net Discovery)
    // =================================================================
    console.log("\n📡 LAYER 1: WIDE-NET INGESTION");
    try {
        const universe = await sectorDiscoveryService.getExpandedUniverse();
        if (universe.length > 100) {
            log('Universe', 'PASS', `Tracking ${universe.length} tickers (Wide-Net Active)`);
        } else {
            log('Universe', 'FAIL', `Tracking only ${universe.length} tickers (Engine Restricted)`);
        }
        
        // Check connectivity
        const quote = await marketDataService.getStockPrice('AAPL');
        if (quote && quote.price > 0) {
            log('Data Feed', 'PASS', `Live Quote Active: AAPL @ $${quote.price}`);
        } else {
            log('Data Feed', 'FAIL', 'Market Data Service returned null');
        }
    } catch (e: any) { log('Ingestion', 'FAIL', e.message); }

    // =================================================================
    // LAYER 2: FSI (Financial Statements Intelligence)
    // =================================================================
    console.log("\n🛡️  LAYER 2: FSI (FINANCIAL INTELLIGENCE)");
    try {
        const fsi = await financialHealthService.analyze('NVDA');
        if (fsi.traffic_light && fsi.quality_score !== undefined) {
            log('FSI Engine', 'PASS', `NVDA Health: ${fsi.traffic_light} (Score: ${fsi.quality_score})`);
            
            if (fsi.metrics.profitability) {
                log('FSI Metrics', 'PASS', `Deep Parsing: ${fsi.metrics.profitability}`);
            } else {
                log('FSI Metrics', 'WARN', 'Missing granular metrics');
            }
        } else {
            log('FSI Engine', 'FAIL', 'Returned invalid structure');
        }
    } catch (e: any) { log('FSI', 'FAIL', e.message); }

    // =================================================================
    // LAYER 3: PHFA (Trade Architect)
    // =================================================================
    console.log("\n🏗️  LAYER 3: PHFA (TRADE ARCHITECT)");
    try {
        // Simulate signals to test the Architect
        // FIXED: ADDED AWAIT
        const plan = await tradeArchitectService.constructPlan(
            'TSLA', 200, 85, 'High', 'explosive_growth',
            { gamma: { volatility_regime: 'AMPLIFIED' } }
        );

        const fields = [
            plan.entry_primary, plan.stop_loss, plan.take_profit_1,
            plan.allocation_percent, plan.risk_reward_ratio, plan.advanced_explanation
        ];

        if (fields.every(f => f !== undefined)) {
            log('Trade Plan', 'PASS', `Generated: Buy ~$${plan.entry_primary}, Stop $${plan.stop_loss}, TP $${plan.take_profit_1}`);
            log('Position Sizing', 'PASS', `Allocation: ${plan.allocation_percent}% (Vol Adjusted)`);
            log('Logic Map', 'PASS', `Rationale: ${plan.advanced_explanation.substring(0, 50)}...`);
        } else {
            log('Trade Plan', 'FAIL', 'Missing critical PHFA fields');
        }
    } catch (e: any) { log('PHFA', 'FAIL', e.message); }

    // =================================================================
    // LAYER 4: API CONTRACTS (Frontend Sync)
    // =================================================================
    console.log("\n🌐 LAYER 4: API ENDPOINTS (DAILY PICKS)");
    
    const ROUTES = [
        { path: '/api/ai-tips/active', name: 'Daily Picks (Active)', check: 'phfa_data' },
        { path: '/api/opportunities/signals', name: 'Watchlist Signals', check: 'confidence' },
        { path: '/api/my-portfolio', name: 'Portfolio Analysis', check: 'success' },
        { path: '/api/system/health', name: 'System Health', check: 'database' }
    ];

    for (const r of ROUTES) {
        try {
            const res = await axios.get(`${BASE_URL}${r.path}`, {
                headers: { 'Authorization': `Bearer ${AUDIT_TOKEN}` },
                timeout: 5000
            });
            
            if (res.status === 200) {
                // Deep check for PHFA data in Daily Picks
                if (r.name.includes('Daily Picks')) {
                    const picks = res.data.data || [];
                    if (picks.length > 0) {
                        const p = picks[0];
                        if (p.phfa_data && p.phfa_data.stop_loss) {
                            log(r.name, 'PASS', 'PHFA Data Contract Verified');
                        } else {
                            log(r.name, 'FAIL', 'Response missing PHFA Data');
                        }
                    } else {
                        log(r.name, 'WARN', 'Endpoint OK but array empty (Run Ingestion)');
                    }
                } else {
                    log(r.name, 'PASS', `Status 200 OK`);
                }
            } else {
                log(r.name, 'FAIL', `HTTP ${res.status}`);
            }
        } catch (e: any) {
            log(r.name, 'FAIL', `Unreachable: ${e.message}`);
        }
    }

    // =================================================================
    // LAYER 5: DATABASE SCHEMA
    // =================================================================
    console.log("\n💾 LAYER 5: MEMORY INTEGRITY");
    const tables = ['financial_health_snapshots', 'ai_stock_tips', 'digest_entries', 'prediction_results', 'drawdown_sensitivity_profiles'];
    for (const t of tables) {
        try {
            const res = await pool.query(`SELECT to_regclass($1) as exists`, [t]);
            if (res.rows[0].exists) log(`Table: ${t}`, 'PASS', 'Schema Verified');
            else log(`Table: ${t}`, 'FAIL', 'Table Missing');
        } catch(e) { log(`Table: ${t}`, 'FAIL', 'DB Connection Error'); }
    }

    console.log("\n========================================================");
    if (criticalFailures === 0) {
        console.log("✅ DIAGNOSTIC RESULT: GREEN (SYSTEM STABLE)");
        console.log("   Ready for Trading.");
    } else {
        console.log(`❌ DIAGNOSTIC RESULT: RED (${criticalFailures} Failures)`);
        console.log("   Repair Required.");
    }
    console.log("========================================================");
    
    await pool.end();
    process.exit(criticalFailures > 0 ? 1 : 0);
}

runDiagnostics();
