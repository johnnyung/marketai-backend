import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import unifiedIntelligenceFactory from '../services/unifiedIntelligenceFactory.js';
import fmpService from '../services/fmpService.js';

async function runPurityProbe() {
    console.log('\n🧪 STARTING DATA PURITY PROBE V3 (FINAL COMPLIANCE)');
    console.log('================================================');

    if (!process.env.FMP_API_KEY) {
        console.error('❌ CRITICAL: No FMP_API_KEY found in environment.');
        process.exit(1);
    }

    const tickers = ['AAPL', 'MSFT', 'NVDA'];
    const results: any[] = [];

    // 1. Direct Service Scan
    console.log('📡 Testing FMP Direct Connectivity...');
    try {
        const q = await fmpService.getPrice('AAPL');
        if (!q || !q.price) console.error('❌ FMP Price: NULL/ZERO (Data Gap)');
        else console.log(`✅ FMP Price: ${q.price} (Real Data)`);
    } catch(e: any) {
        console.error('❌ FMP Failure:', e.message);
    }

    // 2. Engine Variance Scan
    console.log('\n⚙️  Running Engine Variance Test...');
    
    for (const t of tickers) {
        process.stdout.write(`   Scanning ${t.padEnd(5)}... `);
        try {
            const bundle = await unifiedIntelligenceFactory.generateBundle(t);
            
            results.push({
                ticker: t,
                fsi: bundle.engines.fsi.score,
                ace: bundle.engines.ace.street_score,
                gamma: bundle.engines.gamma.exposure,
                score: bundle.scoring.weighted_confidence,
                gmf: bundle.engines.gmf.score,
                narrative: bundle.engines.narrative.score,
                vix: bundle.engines.volatility.vix_level,
                shadow_bias: bundle.engines.shadow.bias,
                
                shadow_fallback: (bundle.engines.shadow as any).fallback_used,
                gmf_fallback: (bundle.engines.gmf as any).fallback_used
            });
            console.log(`Done. (Score: ${bundle.scoring.weighted_confidence.toFixed(1)})`);
        } catch(e: any) {
            console.log(`Failed. (${e.message})`);
        }
        await new Promise(r => setTimeout(r, 1500));
    }

    // 3. Analysis
    console.log('\n📊 PAIRWISE VARIANCE ANALYSIS');
    console.log('------------------------------------------------');
    
    if (results.length < 3) {
        console.error('❌ INSUFFICIENT DATA: Could not generate 3 bundles.');
        process.exit(1);
    }

    let purityScore = 100;
    let failReasons: string[] = [];

    const checkPair = (a: any, b: any, label: string) => {
        if (a.fsi === b.fsi && a.fsi !== 0 && !a.fsi_fallback) {
            purityScore -= 5;
            failReasons.push(`[${label}] Identical FSI scores (${a.fsi})`);
        }
        if (a.ace === b.ace && a.ace !== 0 && !a.ace_fallback) {
            purityScore -= 5;
            failReasons.push(`[${label}] Identical ACE scores (${a.ace})`);
        }
        if (a.score === b.score && a.score !== 0) {
            purityScore -= 10;
            failReasons.push(`[${label}] Identical Final scores (${a.score})`);
        }
    };

    checkPair(results[0], results[1], 'AAPL-MSFT');
    checkPair(results[1], results[2], 'MSFT-NVDA');
    checkPair(results[0], results[2], 'AAPL-NVDA');

    results.forEach(r => {
        if (r.score === 50) {
            purityScore -= 25;
            failReasons.push(`Ticker ${r.ticker} returned exact 50.0 score (Suspicious Mock)`);
        }
        if (r.gmf === 50) {
            purityScore -= 10;
            failReasons.push(`Ticker ${r.ticker} GMF Engine returned 50 (Static placeholder)`);
        }
        const allVixIdentical = results.every(res => res.vix === 20);
        if (r.vix === 20 && allVixIdentical) {
             purityScore -= 10;
             failReasons.push(`Ticker ${r.ticker} VIX returned static 20 (Fallback/Hardcoded)`);
        }
        if (r.shadow_bias === 'NEUTRAL' && r.shadow_fallback) {
             purityScore -= 5;
             failReasons.push(`Ticker ${r.ticker} Shadow Bias returned 'NEUTRAL' via fallback`);
        }
    });

    console.log('\n📋 PURITY REPORT');
    if (failReasons.length === 0) {
        console.log('   ✅ No variance violations found.');
    } else {
        failReasons.forEach(r => console.log(`   ❌ ${r}`));
    }

    console.log('\n------------------------------------------------');
    console.log(`🏆 SYSTEM PURITY SCORE: ${purityScore}/100`);
    
    if (purityScore < 100) {
        console.error('⚠️  AUDIT FAILED: Mock data or static fallbacks detected.');
        process.exit(1);
    } else {
        console.log('✅ AUDIT PASSED: System is clean.');
        process.exit(0);
    }
}

runPurityProbe();
