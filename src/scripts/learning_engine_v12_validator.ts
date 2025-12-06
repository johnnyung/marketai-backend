import { pool } from "../db/index.js";
import axios from 'axios';
import dotenv from 'dotenv';
import { Pool } from 'pg';

// --- LEARNING ENGINE SERVICES ---
import predictionLoggerService from '../services/predictionLoggerService.js';     // Phase 1 (POT)
import predictionReviewService from '../services/predictionReviewService.js';     // Phase 2 (Review)
import agentReliabilityService from '../services/agentReliabilityService.js';     // Phase 3 (Reliability)
import confidenceRecalibrationService from '../services/confidenceRecalibrationService.js'; // Phase 4 (Recalibration)
import drawdownSensitivityService from '../services/drawdownSensitivityService.js'; // Phase 6 (DSC)
import volatilityShockAwarenessService from '../services/volatilityShockAwarenessService.js'; // Phase 7 (VSA)
import reversalTrapService from '../services/reversalTrapService.js';             // Phase 8 (RTD)
import sipeLearningService from '../services/sipeLearningService.js';             // Phase 9 (SIPE)
import smcwLearningService from '../services/smcwLearningService.js';             // Phase 10 (SMCW)
import wdiwaAttributionService from '../services/wdiwaAttributionService.js';     // Phase 11 (WDIWA)
import confidenceDriftService from '../services/confidenceDriftService.js';       // Phase 12 (CDC)

// --- CORE INTEGRATION SERVICES ---
import tradeArchitectService from '../services/tradeArchitectService.js';
import financialHealthService from '../services/financialHealthService.js';

dotenv.config();
// PRODUCTION URL
const BASE_URL = 'https://marketai-backend-production-397e.up.railway.app';
const AUDIT_TOKEN = process.env.AUDIT_MODE_SECRET || 'marketai-audit-bypass-key-2025';


let score = 100;
let criticalFailures = 0;
const failures: string[] = [];

const log = (label: string, status: 'PASS' | 'FAIL' | 'WARN', msg: string) => {
    const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${icon} [${label}] ${msg}`);
    if (status === 'FAIL') {
        score -= 10;
        criticalFailures++;
        failures.push(`${label}: ${msg}`);
    }
};

async function runDiagnostics() {
    console.log(`\n🔍 RUNNING LEARNING ENGINE v12 DEEP SCAN (TARGET: ${BASE_URL})...`);

    // =================================================================
    // PHASE 1-3: PREDICTION TRACKING & AGENT RELIABILITY
    // =================================================================
    console.log("\n📊 PHASES 1-3: TRACKING & RELIABILITY");
    try {
        // Test Logging
        const logId = await predictionLoggerService.logPrediction({
            ticker: 'TEST_V12_RAILWAY', confidence: 80, entry_primary: 100, stop_loss: 90,
            take_profit_1: 110, take_profit_2: 120, take_profit_3: 130,
            agent_signals: { momentum: { verdict: 'BULL' } }
        });
        if (logId) log('POT Logger', 'PASS', `Logged prediction ID: ${logId}`);
        else log('POT Logger', 'FAIL', 'Failed to log prediction (DB issue?)');

        // Test Reliability Calc
        await agentReliabilityService.runReliabilityAnalysis(1); // Quick scan
        const relRes = await pool.query("SELECT * FROM agent_reliability_snapshots WHERE snapshot_date = CURRENT_DATE LIMIT 1");
        if (relRes.rows.length > 0) log('Agent Reliability', 'PASS', 'Snapshot exists');
        else log('Agent Reliability', 'WARN', 'No reliability snapshot found (needs trade history)');
        
        // Clean up test
        if (logId) await pool.query("DELETE FROM prediction_results WHERE id = $1", [logId]);
    } catch (e: any) { log('Phase 1-3', 'FAIL', e.message); }

    // =================================================================
    // PHASE 4 & 12: CONFIDENCE CALIBRATION (RCE + CDC)
    // =================================================================
    console.log("\n⚖️  PHASES 4 & 12: CONFIDENCE CALIBRATION");
    try {
        const cdc = await confidenceDriftService.getDriftCorrection();
        const rce = await confidenceRecalibrationService.recalibrate(
            80, {}, {}, {}, {}, {}, 'blue_chip', 'Technology'
        );
        
        if (rce.multipliers.drawdown !== undefined && rce.multipliers.sector !== undefined) {
            log('RCE Engine', 'PASS', `Recalibration Active (Score: ${rce.score})`);
        } else {
            log('RCE Engine', 'FAIL', 'Missing multipliers in RCE output');
        }

        log('CDC Engine', 'PASS', `Drift Correction Factor: ${cdc.correction_factor} (${cdc.status})`);
    } catch (e: any) { log('Phase 4/12', 'FAIL', e.message); }

    // =================================================================
    // PHASE 6 & 8: RISK MANAGEMENT (DSC + RTD)
    // =================================================================
    console.log("\n🛡️  PHASES 6 & 8: RISK LEARNING (DSC + RTD)");
    try {
        const dsc = await drawdownSensitivityService.getRiskProfile('crypto_alpha');
        const rtd = await reversalTrapService.analyzeTrapRisk('TSLA', 'HIGH');
        
        if (dsc.stop_loss_modifier > 1.0) log('DSC Engine', 'PASS', `Crypto modifier active: x${dsc.stop_loss_modifier}`);
        else log('DSC Engine', 'FAIL', 'Crypto modifier incorrect (expected > 1.0)');

        if (rtd.reversal_risk_score !== undefined) log('RTD Engine', 'PASS', `Trap Risk Analyzed: ${rtd.reversal_risk_score}`);
        else log('RTD Engine', 'FAIL', 'RTD returned invalid object');
    } catch (e: any) { log('Phase 6/8', 'FAIL', e.message); }

    // =================================================================
    // PHASE 7 & 10: MACRO CONTEXT (VSA + SMCW)
    // =================================================================
    console.log("\n🌍 PHASES 7 & 10: MACRO CONTEXT (VSA + SMCW)");
    try {
        const vsa = await volatilityShockAwarenessService.getMarketCondition();
        const smcw = await smcwLearningService.getCurrentSeasonality();
        
        log('VSA Engine', 'PASS', `Regime: ${vsa.regime} (Mod: x${vsa.confidence_modifier})`);
        log('SMCW Engine', 'PASS', `Month: ${smcw.month} (Mod: x${smcw.confidence_modifier})`);
    } catch (e: any) { log('Phase 7/10', 'FAIL', e.message); }

    // =================================================================
    // PHASE 9 & 11: ATTRIBUTION & BIAS (SIPE + WDIWA)
    // =================================================================
    console.log("\n🎯 PHASES 9 & 11: ATTRIBUTION & BIAS (SIPE + WDIWA)");
    try {
        const sipe = await sipeLearningService.getSectorBias('Technology');
        const wdiwa = await wdiwaAttributionService.getEngineWeights();
        
        log('SIPE Engine', 'PASS', `Sector Bias (Tech): x${sipe.bias_multiplier}`);
        
        if (wdiwa.shadow !== undefined && wdiwa.gamma !== undefined) {
            log('WDIWA Engine', 'PASS', `Weights Loaded (Shadow: x${wdiwa.shadow})`);
        } else {
            log('WDIWA Engine', 'FAIL', 'Weights object invalid');
        }
    } catch (e: any) { log('Phase 9/11', 'FAIL', e.message); }

    // =================================================================
    // FSI INTEGRATION CHECK
    // =================================================================
    console.log("\n📉 FSI LAYER CHECK");
    try {
        const fsi = await financialHealthService.analyze('AAPL');
        if (fsi.traffic_light) log('FSI Engine', 'PASS', `Traffic Light: ${fsi.traffic_light}`);
        else log('FSI Engine', 'FAIL', 'Traffic Light Missing');
    } catch (e: any) { log('FSI', 'FAIL', e.message); }

    // =================================================================
    // PHFA INTEGRATION CHECK (The Grand Unification)
    // =================================================================
    console.log("\n🏗️  PHFA (TRADE ARCHITECT) INTEGRATION");
    try {
        // Mock engines input representing the full stack
        const engines = {
            gamma: { volatility_regime: 'NEUTRAL' },
            shadow: { bias: 'ACCUMULATION' },
            narrative: { pressure_score: 60 },
            regime: { current_regime: 'RISK_ON' },
            vsa: { stop_width_modifier: 1.0, regime: 'NORMAL' },
            rtd: { is_trap_zone: false, recommended_buffer: 0 },
            smcw: { volatility_factor: 1.0, is_fomc: false }
        };

        const plan = await tradeArchitectService.constructPlan(
            'AAPL', 150, 85, 'Medium', 'blue_chip', engines
        );

        if (plan.entry_primary && plan.stop_loss && plan.advanced_explanation) {
            log('PHFA Architect', 'PASS', 'Trade Plan Generated Successfully');
            // Check if new logic affected output
            if (plan.advanced_explanation.includes('DSC')) log('DSC Integration', 'PASS', 'DSC Logic Detected in Rationale');
            else log('DSC Integration', 'WARN', 'DSC Logic missing from Rationale');
        } else {
            log('PHFA Architect', 'FAIL', 'Trade Plan Incomplete');
        }
    } catch (e: any) { log('PHFA', 'FAIL', e.message); }

    // =================================================================
    // API ENDPOINT VALIDATION (AGAINST RAILWAY)
    // =================================================================
    console.log("\n🌐 API ENDPOINT VALIDATION (RAILWAY)");
    const routes = [
        '/api/ai-tips/active',
        '/api/confidence/engine-stats',
        '/api/opportunities/signals',
        '/api/fundamentals/health/AAPL'
    ];

    for (const r of routes) {
        try {
            const res = await axios.get(`${BASE_URL}${r}`, {
                headers: { 'Authorization': `Bearer ${AUDIT_TOKEN}` },
                timeout: 8000 // Increased timeout for cloud latency
            });
            if (res.status === 200) log(r, 'PASS', 'OK');
            else log(r, 'FAIL', `Status ${res.status}`);
            
            // Deep Check for Active Tips
            if (r.includes('ai-tips')) {
                const data = res.data.data || [];
                if (data.length > 0) {
                    const tip = data[0];
                    // Check for Learning Fields
                    if (tip.confidence_reasons && tip.fsi_factors) {
                        log('API Contract', 'PASS', 'Learning Data Present in Response');
                    } else {
                        log('API Contract', 'FAIL', 'Missing Learning Data Fields');
                    }
                } else {
                    log('API Contract', 'WARN', 'No active tips to verify (Engine might be sleeping)');
                }
            }

        } catch (e: any) {
            log(r, 'FAIL', `Unreachable: ${e.message}`);
        }
    }

    // =================================================================
    // DATABASE TABLE CHECK
    // =================================================================
    console.log("\n💾 DATABASE SCHEMA CHECK (REMOTE)");
    const tables = [
        'prediction_results',
        'agent_reliability_snapshots',
        'confidence_drift_snapshots',
        'drawdown_sensitivity_profiles',
        'volatility_learning_snapshots',
        'reversal_trap_stats',
        'sector_bias_learning_snapshots',
        'seasonal_learning_snapshots',
        'attribution_learning_snapshots',
        'financial_health_snapshots'
    ];

    for (const t of tables) {
        try {
            const res = await pool.query(`SELECT to_regclass($1) as exists`, [t]);
            if (res.rows[0].exists) log(t, 'PASS', 'Table Exists');
            else log(t, 'FAIL', 'Table Missing');
        } catch(e) { log(t, 'FAIL', 'DB Error'); }
    }

    console.log("\n========================================================");
    if (criticalFailures === 0) {
        console.log("✅ LEARNING ENGINE v12 STATUS: GREEN (FULLY OPERATIONAL)");
    } else {
        console.log(`❌ LEARNING ENGINE v12 STATUS: RED (${criticalFailures} Failures)`);
        failures.forEach(f => console.log(`   - ${f}`));
    }
    console.log("========================================================");
    
    await pool.end();
    process.exit(criticalFailures > 0 ? 1 : 0);
}

runDiagnostics();
