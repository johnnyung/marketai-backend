import { Pool } from 'pg';
import dotenv from 'dotenv';

// --- SERVICES ---
import marketDataService from '../../services/marketDataService.js';
import fmpService from '../../services/fmpService.js';
import tiingoService from '../../services/tiingoService.js';
import yahooFinanceService from '../../services/yahooFinanceService.js';
import secEdgarService from '../../services/secEdgarService.js';
import politicalIntelligenceService from '../../services/politicalIntelligenceService.js';
import macroLiquidityService from '../../services/macroLiquidityService.js';
import gammaExposureService from '../../services/gammaExposureService.js';
import marketSentimentService from '../../services/marketSentimentService.js';
import manufacturingSupplyChainService from '../../services/manufacturingSupplyChainService.js';
import newsEmbeddingService from '../../services/newsEmbeddingService.js';
import insiderIntentService from '../../services/insiderIntentService.js';
import currencyShockService from '../../services/currencyShockService.js';
import narrativePressureService from '../../services/narrativePressureService.js';
import etfLeakageService from '../../services/etfLeakageService.js';
import shadowLiquidityService from '../../services/shadowLiquidityService.js';
import reverseArbitrageService from '../../services/reverseArbitrageService.js';
import revisionVelocityService from '../../services/revisionVelocityService.js';
import expandedSocialService from '../../services/expandedSocialService.js';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  data_count: number;
  latency_ms: number;
  db_verified: boolean;
  message: string;
}

const RESULTS: TestResult[] = [];

async function runTest(name: string, fn: () => Promise<any>, checkDbTable?: string) {
    const start = Date.now();
    try {
        const data = await fn();
        const latency = Date.now() - start;
        
        let count = 0;
        if (Array.isArray(data)) count = data.length;
        else if (data && typeof data === 'object') count = Object.keys(data).length > 0 ? 1 : 0;

        let dbVerified = false;
        if (checkDbTable && count > 0) {
            try {
                const dbRes = await pool.query(`
                    SELECT count(*) FROM ${checkDbTable}
                    WHERE created_at > NOW() - INTERVAL '5 minutes'
                `);
                if (parseInt(dbRes.rows[0].count) > 0) dbVerified = true;
            } catch (e) {
                // Table might not exist or query error, consider not verified
            }
        } else if (!checkDbTable) {
            dbVerified = true; // Logic-only test
        }

        RESULTS.push({
            name,
            status: count > 0 ? 'PASS' : 'WARN',
            data_count: count,
            latency_ms: latency,
            db_verified: dbVerified,
            message: count > 0 ? 'Data received' : 'No data returned (Check API)'
        });

    } catch (e: any) {
        RESULTS.push({
            name,
            status: 'FAIL',
            data_count: 0,
            latency_ms: Date.now() - start,
            db_verified: false,
            message: e.message
        });
    }
}

async function main() {
    console.log("   🧪 RUNNING INGESTION MATRIX...\n");

    // 1. CORE MARKET DATA (The Mesh)
    await runTest('FMP Stable', () => fmpService.getPrice('AAPL'));
    await runTest('Tiingo Fallback', () => tiingoService.getPrice('AAPL'));
    await runTest('Yahoo Fallback', () => yahooFinanceService.getPrice('AAPL'));
    await runTest('Data Mesh Router', () => marketDataService.getStockPrice('AAPL'));

    // 2. MACRO & POLICY
    await runTest('Currency Shock (v104)', () => currencyShockService.analyzeShock(), 'currency_shocks');
    await runTest('Macro Liquidity', () => macroLiquidityService.getLiquidityState());
    await runTest('Political Intel', () => politicalIntelligenceService.getGovernmentAnnouncements());
    
    // 3. INSTITUTIONAL & INSIDER
    await runTest('SEC Insider', () => secEdgarService.getRecentInsiderTrades(5));
    await runTest('Insider Intent (v102)', () => insiderIntentService.analyzeIntent('AAPL'), 'insider_intent_logs');
    await runTest('Shadow Liquidity (v109)', () => shadowLiquidityService.scanShadows('SPY'), 'shadow_liquidity_prints');
    await runTest('ETF Leakage (v97)', () => etfLeakageService.detectLeakage());

    // 4. SENTIMENT & NARRATIVE
    await runTest('Market Thermometer (v108)', () => marketSentimentService.getThermometer());
    await runTest('Narrative Pressure (v103)', () => narrativePressureService.calculatePressure('NVDA'), 'narrative_pressure_logs');
    await runTest('Social Sentiment', () => expandedSocialService.getRedditInvestingSentiment());
    await runTest('News Embedding (v96)', () => newsEmbeddingService.generateEmbedding("Market Crash"));

    // 5. DERIVATIVES & TECHNICALS
    await runTest('Gamma Exposure (v101)', () => gammaExposureService.analyze('SPY'), 'gamma_snapshots');
    await runTest('Revision Velocity', () => revisionVelocityService.analyzeVelocity('MSFT'));
    await runTest('Reverse Arbitrage', () => reverseArbitrageService.scanOpportunities());

    // 6. SUPPLY CHAIN
    await runTest('Supply Chain (v98)', () => manufacturingSupplyChainService.getManufacturingData());

    // REPORT
    console.log("======================================================================================");
    console.log(
        "%-30s | %-6s | %-8s | %-8s | %-8s | %s",
        "COLLECTOR", "STATUS", "COUNT", "LATENCY", "DB WRITE", "MESSAGE"
    );
    console.log("--------------------------------------------------------------------------------------");

    RESULTS.forEach(r => {
        const statusIcon = r.status === 'PASS' ? '✅' : r.status === 'WARN' ? '⚠️ ' : '❌';
        const dbIcon = r.db_verified ? 'YES' : 'NO';
        console.log(
            "%-30s | %s %-4s | %-8s | %-8s | %-8s | %s",
            r.name, statusIcon, r.status, r.data_count, r.latency_ms + 'ms', dbIcon, r.message
        );
    });
    console.log("======================================================================================");

    const failures = RESULTS.filter(r => r.status === 'FAIL').length;
    if (failures > 0) {
        console.log(`\n🚨 CORTEX FAILURE: ${failures} collectors failed.`);
        process.exit(1);
    } else {
        console.log("\n✅ INGESTION CORTEX FULLY OPERATIONAL.");
        process.exit(0);
    }
}

main();
