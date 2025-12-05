import dotenv from 'dotenv';
import { Pool } from 'pg';

// A. MACRO & CYCLES
import financialClockService from '../services/financialClockService.js';
import recessionPredictorService from '../services/recessionPredictorService.js';
import globalDivergenceService from '../services/globalDivergenceService.js';
import economicSurpriseService from '../services/economicSurpriseService.js';
import inflationMapService from '../services/inflationMapService.js';

// B. INSTITUTIONAL FLOWS
import smartMoneyService from '../services/smartMoneyService.js';
import etfShadowService from '../services/etfShadowService.js';
import optionsRadarService from '../services/optionsRadarService.js';
import institutionalFlowService from '../services/institutionalFlowService.js';

// C. BEHAVIORAL & HISTORICAL
import marketEchoService from '../services/marketEchoService.js';
import narrativeDriftService from '../services/narrativeDriftService.js';
import alphaReplayService from '../services/alphaReplayService.js';
import insiderPatternService from '../services/insiderPatternService.js';

// D. RISK & VALIDATION
import crisisAmplifierService from '../services/crisisAmplifierService.js';
import corporateQualityService from '../services/corporateQualityService.js';
import liquidityTrapService from '../services/liquidityTrapService.js';
import shortTrapService from '../services/shortTrapService.js';

// E. CORRELATION & CAUSALITY
import reverseArbitrageService from '../services/reverseArbitrageService.js';
import beneficiaryRouterService from '../services/beneficiaryRouterService.js';
import revisionVelocityService from '../services/revisionVelocityService.js';
import catalystHunterService from '../services/catalystHunterService.js';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function testVector(name: string, fn: () => Promise<any>) {
    process.stdout.write(`   Testing ${name.padEnd(30)} ... `);
    try {
        const start = Date.now();
        const result = await fn();
        const duration = Date.now() - start;
        
        // Validation logic
        let status = "✅ ONLINE";
        let details = "";

        if (!result) {
            status = "⚠️  NULL RESPONSE";
        } else if (Array.isArray(result) && result.length === 0) {
            status = "⚠️  EMPTY ARRAY";
            details = "(No signals found)";
        } else if (result.passed === false || result.is_crisis === false) {
             // Some services return objects where 'false' is a valid, successful state
             status = "✅ ONLINE";
             details = "(Negative Result Valid)";
        } else {
             details = `(${duration}ms)`;
        }

        console.log(`${status} ${details}`);
        return true;
    } catch (e: any) {
        console.log(`❌ FAILED`);
        console.error(`      Error: ${e.message}`);
        return false;
    }
}

async function runDiagnostics() {
    console.log("\n🔎 STARTING OMNI-VECTOR SYSTEM CHECK\n");

    console.log("--- [A] MACRO & CYCLES ---");
    await testVector("Financial Clock", () => financialClockService.getClockState());
    await testVector("Recession Predictor", () => recessionPredictorService.predictRecessionRisk());
    await testVector("Global Divergence", () => globalDivergenceService.analyzeGlobalState());
    await testVector("Economic Surprise (ESI)", () => economicSurpriseService.calculateESI());
    await testVector("Inflation Map", () => inflationMapService.getRegime());

    console.log("\n--- [B] INSTITUTIONAL FLOWS ---");
    await testVector("Smart Money Footprints", () => smartMoneyService.scanFootprints());
    await testVector("ETF Shadow Indexing", () => etfShadowService.scanRebalancingRisks());
    await testVector("Options Radar", () => optionsRadarService.scanFlows());
    await testVector("Institutional Flow", () => institutionalFlowService.scanFlows());

    console.log("\n--- [C] BEHAVIORAL & HISTORICAL ---");
    await testVector("Market Echo Detector", () => marketEchoService.detectEchoes());
    await testVector("Narrative Drift", () => narrativeDriftService.measureDrift());
    await testVector("Alpha Replay Sim", () => alphaReplayService.simulateReplay());
    await testVector("Insider Pattern Break", () => insiderPatternService.analyzePattern('NVDA')); // Test with NVDA

    console.log("\n--- [D] RISK & VALIDATION ---");
    await testVector("Crisis Amplifier", () => crisisAmplifierService.evaluateSignal('AAPL', 'BUY', 'Technology'));
    await testVector("Corporate Health", () => corporateQualityService.analyzeHealth('TSLA'));
    await testVector("Liquidity Trap", () => liquidityTrapService.screen('AAPL', 'blue_chip'));
    await testVector("Short Trap", () => shortTrapService.analyze('GME', 80));

    console.log("\n--- [E] CORRELATION & CAUSALITY ---");
    await testVector("Reverse Arbitrage", () => reverseArbitrageService.scanOpportunities());
    await testVector("Beneficiary Router", () => beneficiaryRouterService.mapOpportunities());
    await testVector("Revision Velocity", () => revisionVelocityService.analyzeVelocity('MSFT'));
    await testVector("Catalyst Hunter", () => catalystHunterService.huntInsiderPlays());

    console.log("\n✅ DIAGNOSTIC COMPLETE.");
    process.exit(0);
}

runDiagnostics();
