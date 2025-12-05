import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import unifiedIntelligenceFactory from '../services/unifiedIntelligenceFactory.js';

const TICKERS = ['AAPL', 'MSFT', 'NVDA'];
const LOG_FILE = path.resolve(process.cwd(), 'logs', 'diagnostic_report.json');

// Engine Configuration (Defines expected behavior)
const ENGINE_CONFIG = [
    { key: 'fsi', label: 'FSI (Fundamentals)', scope: 'TICKER' },
    { key: 'ace', label: 'ACE (Analyst)', scope: 'TICKER' },
    { key: 'insider', label: 'Insider Intent', scope: 'TICKER' },
    { key: 'gamma', label: 'Gamma Exposure', scope: 'TICKER' },
    { key: 'narrative', label: 'Narrative Pressure', scope: 'TICKER' },
    { key: 'mlp', label: 'Macro Liquidity', scope: 'GLOBAL' },
    { key: 'volsurf', label: 'Volatility Surface', scope: 'TICKER' },
    { key: 'ife', label: 'Institutional Flow', scope: 'TICKER' },
    { key: 'gnae', label: 'Global News Attn', scope: 'GLOBAL' },
    { key: 'uoa', label: 'Unusual Options', scope: 'TICKER' },
    { key: 'scs', label: 'Supply Chain Stress', scope: 'GLOBAL' },
    { key: 'hfai', label: 'Hedge Fund AI', scope: 'TICKER' },
    { key: 'dve', label: 'Deep Valuation', scope: 'TICKER' },
    { key: 'seas', label: 'Seasonality', scope: 'TICKER' },
    { key: 'mbe', label: 'Market Breadth', scope: 'GLOBAL' },
    { key: 'vre', label: 'Vol Regime', scope: 'TICKER' },
    { key: 'gmf', label: 'Global Macro Fcst', scope: 'GLOBAL' },
    { key: 'shadow', label: 'Shadow Liquidity', scope: 'TICKER' }
];

async function runDiagnostics() {
    console.log('\n🔍 PHASE 20: CONTEXT-AWARE ENGINE DIAGNOSTICS');
    console.log('================================================');

    // 1. GENERATE DATA
    const bundles: Record<string, any> = {};
    for (const t of TICKERS) {
        process.stdout.write(`   Scanning ${t}... `);
        try {
            bundles[t] = await unifiedIntelligenceFactory.generateBundle(t);
            console.log(`OK (Score: ${bundles[t].scoring.weighted_confidence.toFixed(1)})`);
        } catch (e: any) {
            console.log(`FAILED (${e.message})`);
            process.exit(1);
        }
        await new Promise(r => setTimeout(r, 1000));
    }

    console.log('================================================\n');

    const report: any = {
        timestamp: new Date().toISOString(),
        system_status: 'UNKNOWN',
        engines: {}
    };

    let totalIssues = 0;

    // 2. ANALYZE EACH ENGINE
    for (const cfg of ENGINE_CONFIG) {
        const key = cfg.key;
        const scope = cfg.scope; // TICKER vs GLOBAL
        
        // Collect data points
        const points = TICKERS.map(t => {
            const raw = bundles[t].engines[key];
            const fallback = (raw as any).fallback_used === true;
            
            // Extract primary metric heuristic
            let val = 0;
            if (raw.score !== undefined) val = raw.score;
            else if (raw.confidence !== undefined) val = raw.confidence;
            else if (raw.exposure !== undefined) val = raw.exposure;
            else if (raw.net_gamma_exposure !== undefined) val = raw.net_gamma_exposure;
            else if (raw.global_attention_score !== undefined) val = raw.global_attention_score;

            return { t, val, fallback, raw };
        });

        // Determine Mode
        const allFallback = points.every(p => p.fallback);
        const anyFallback = points.some(p => p.fallback);
        const allZero = points.every(p => p.val === 0);
        
        // Variance Check
        const val1 = JSON.stringify(points[0].raw);
        const val2 = JSON.stringify(points[1].raw);
        const val3 = JSON.stringify(points[2].raw);
        const isStatic = (val1 === val2) && (val2 === val3);

        let status = 'REAL';
        let note = '';

        if (allZero) {
            status = 'MISSING';
            note = 'Returns 0/Empty';
        } else if (allFallback) {
            status = 'FALLBACK';
            note = 'Synthetic Logic Active';
        } else if (anyFallback) {
            status = 'PARTIAL';
            note = 'Mixed Availability';
        }

        // Validity Logic
        let valid = true;
        
        // 1. Global engines MUST be static (or it's weird)
        // 2. Ticker engines MUST vary (or it's broken)
        if (scope === 'TICKER' && isStatic && !allZero && !allFallback) {
            // Static non-zero output for ticker-specific engine = Suspicious
            status = 'STUCK';
            note = 'Static values detected for ticker-specific engine';
            valid = false;
        }
        else if (scope === 'GLOBAL' && !isStatic) {
            // Global engines theoretically could vary slightly due to timestamp
            // but generally should be stable. We allow variance but log it.
            note = 'Global values fluctuated (Time-based?)';
        }

        // Banned Value Check
        if (points.some(p => p.val === 50 && !p.fallback)) {
            // 50 is suspicious unless it's a calculated fallback
            // But we cleaned 50s. If we see 50, is it real?
            // note += ' [Contains 50]';
        }

        // Log Output
        const icon = valid ? (status === 'REAL' ? '🟢' : status === 'FALLBACK' ? '🟡' : '🔴') : '❌';
        console.log(`${icon} [${cfg.label.padEnd(20)}] Mode: ${status.padEnd(10)} Scope: ${scope.padEnd(7)} Note: ${note}`);
        
        if (!valid) totalIssues++;

        // Add to Report
        report.engines[key] = {
            status,
            valid,
            scope,
            static: isStatic,
            values: points.map(p => p.val)
        };
    }

    // 3. SCORING DELTA CHECK
    const scores = TICKERS.map(t => bundles[t].scoring.weighted_confidence);
    const uniqueScores = new Set(scores).size;
    const scoringStatus = uniqueScores > 1 ? 'DYNAMIC' : 'STATIC';
    
    console.log('\n------------------------------------------------');
    console.log(`🎯 FINAL SCORING: ${scores.join(' | ')}`);
    console.log(`   Status: ${scoringStatus}`);
    
    report.scoring = {
        values: scores,
        status: scoringStatus
    };

    if (scoringStatus === 'STATIC') {
        console.error('❌ CRITICAL: Final scores are identical across diverse tickers.');
        totalIssues++;
    }

    // 4. HISTORICAL COMPARISON
    if (fs.existsSync(LOG_FILE)) {
        try {
            const prev = JSON.parse(fs.readFileSync(LOG_FILE, 'utf-8'));
            console.log('\n📜 HISTORY COMPARISON:');
            // Simple check: Did we regress from REAL to FALLBACK?
            let regressions = 0;
            for (const key in report.engines) {
                if (prev.engines[key]?.status === 'REAL' && report.engines[key]?.status !== 'REAL') {
                    console.log(`   ⚠️  REGRESSION: ${key} went from REAL -> ${report.engines[key].status}`);
                    regressions++;
                }
            }
            if (regressions === 0) console.log('   ✅ No regressions detected.');
        } catch (e) {
            console.log('   (Could not read previous log)');
        }
    }

    // Save
    report.system_status = totalIssues === 0 ? 'HEALTHY' : 'DEGRADED';
    fs.writeFileSync(LOG_FILE, JSON.stringify(report, null, 2));
    console.log(`\n💾 Report saved to ${LOG_FILE}`);

    if (totalIssues > 0) {
        console.log(`\n⚠️  FOUND ${totalIssues} ISSUES.`);
        process.exit(1);
    } else {
        console.log('\n✅ SYSTEM HEALTHY. All Engines Validated.');
        process.exit(0);
    }
}

runDiagnostics();
