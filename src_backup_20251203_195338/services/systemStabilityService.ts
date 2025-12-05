import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

interface IntegrityReport {
  status: 'STABLE' | 'COMPROMISED' | 'CRITICAL';
  score: number; // 0-100
  checks: {
    files: { total: number, missing: string[] };
    logic: { atrophied: string[], disconnected: string[] };
    database: { missing_tables: string[], missing_columns: string[] };
    pipeline: { status: string, last_activity: string };
  };
}

// THE GOLDEN MANIFEST (v1-v92)
const REQUIRED_FILES = [
  'services/marketDataService.ts', 'services/fmpService.ts', 'services/tiingoService.ts',
  'services/yahooFinanceService.ts', 'services/newsAggregatorService.ts', 'services/redditService.ts',
  'services/secEdgarService.ts', 'services/governmentDataService.ts', 'services/macroLiquidityService.ts',
  'services/catalystHunterService.ts', 'services/titanHunterService.ts', 'services/insiderPatternService.ts',
  'services/marketEchoService.ts', 'services/narrativeDriftService.ts', 'services/alphaReplayService.ts',
  'services/financialClockService.ts', 'services/macroRegimeService.ts', 'services/recessionPredictorService.ts',
  'services/globalDivergenceService.ts', 'services/supplyChainShockMapper.ts', 'services/crossSignalConsensusEngine.ts',
  'services/comprehensiveDataEngine.ts', 'services/tribunalService.ts', 'services/neuralChatService.ts',
  'services/tradeManagementService.ts', 'services/paperTradingService.ts', 'services/portfolioManagerService.ts',
  'services/corporateQualityService.ts', 'services/confidenceLedgerService.ts', 'services/schemaHarmonizerService.ts',
  'services/lazarusService.ts', 'services/sourceGuardService.ts'
];

const REQUIRED_SCHEMA: Record<string, string[]> = {
  'ai_stock_tips': ['decision_matrix', 'tribunal_data', 'final_pnl', 'exit_strategy'],
  'trades': ['ticker', 'asset_type', 'price', 'reason'],
  'digest_entries': ['anomaly_score', 'embedding_vector'],
  'historical_events': ['affected_sectors', 'recovery_pattern'],
  'confidence_ledger': ['adjusted_confidence', 'outcome_pnl_pct']
};

class SystemStabilityService {

  async runIntegrityCheck(): Promise<IntegrityReport> {
    console.log('   🛡️  PSSL: Running Deep Integrity Scan...');
    
    const report: IntegrityReport = {
      status: 'STABLE',
      score: 100,
      checks: {
        files: { total: 0, missing: [] },
        logic: { atrophied: [], disconnected: [] },
        database: { missing_tables: [], missing_columns: [] },
        pipeline: { status: 'UNKNOWN', last_activity: '' }
      }
    };

    // 1. FILE SYSTEM SCAN
    const srcDir = path.resolve('src');
    for (const file of REQUIRED_FILES) {
        const filePath = path.join(srcDir, file);
        if (!fs.existsSync(filePath)) {
            report.checks.files.missing.push(file);
            report.score -= 5;
        } else {
            // Logic Density Check (Anti-Stub)
            const content = fs.readFileSync(filePath, 'utf-8');
            if (content.length < 600) {
                report.checks.logic.atrophied.push(file);
                report.score -= 5;
            }
            // Wiring Check (Basic)
            if (file.endsWith('Service.ts') && !file.includes('comprehensive')) {
                // Check if imported in Orchestrator (simple grep simulation)
                const orchestrator = fs.readFileSync(path.join(srcDir, 'services/comprehensiveDataEngine.ts'), 'utf-8');
                const serviceName = path.basename(file, '.ts');
                if (!orchestrator.includes(serviceName)) {
                     // Exceptions for helpers
                     if (!['fmpService', 'tiingoService', 'yahooFinanceService', 'lazarusService'].includes(serviceName)) {
                        report.checks.logic.disconnected.push(serviceName);
                        report.score -= 2;
                     }
                }
            }
        }
    }
    report.checks.files.total = REQUIRED_FILES.length - report.checks.files.missing.length;

    // 2. DATABASE SCHEMA SCAN
    try {
        const client = await pool.connect();
        for (const [table, cols] of Object.entries(REQUIRED_SCHEMA)) {
            const tblRes = await client.query(`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)`, [table]);
            if (!tblRes.rows[0].exists) {
                report.checks.database.missing_tables.push(table);
                report.score -= 10;
                continue;
            }

            const colRes = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = $1`, [table]);
            const existingCols = colRes.rows.map((r: any) => r.column_name);
            for (const col of cols) {
                if (!existingCols.includes(col)) {
                    report.checks.database.missing_columns.push(`${table}.${col}`);
                    report.score -= 5;
                }
            }
        }
        
        // 3. PIPELINE FLOW CHECK
        const flowRes = await client.query(`SELECT MAX(created_at) as last_tip FROM ai_stock_tips`);
        if (flowRes.rows[0].last_tip) {
            report.checks.pipeline.last_activity = new Date(flowRes.rows[0].last_tip).toISOString();
            const hoursSince = (Date.now() - new Date(flowRes.rows[0].last_tip).getTime()) / (1000 * 60 * 60);
            if (hoursSince < 24) report.checks.pipeline.status = 'ACTIVE';
            else {
                report.checks.pipeline.status = 'STALE';
                report.score -= 10;
            }
        } else {
            report.checks.pipeline.status = 'INACTIVE';
            report.score -= 20;
        }

        client.release();
    } catch (e: any) {
        console.error("   ❌ PSSL Database Error:", e.message);
        report.score = 0;
    }

    // Final Status Calculation
    if (report.score < 60) report.status = 'CRITICAL';
    else if (report.score < 90) report.status = 'COMPROMISED';

    return report;
  }
}

export default new SystemStabilityService();
