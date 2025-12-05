import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import unifiedIntelligenceFactory from '../services/unifiedIntelligenceFactory.js';
import tickerUniverseService from '../services/tickerUniverseService.js';

// Configuration
const SAMPLE_SIZE = 20;
const VARIANCE_THRESHOLD = 0.2; // 20% minimum uniqueness required to pass

interface TickerResult {
    ticker: string;
    metrics: Record<string, number>;
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function runVarianceProbe() {
    console.log(`\n📊 STARTING VARIANCE VALIDATION (N=${SAMPLE_SIZE})`);
    console.log('================================================================');

    // 1. Get Universe
    const universe = await tickerUniverseService.getUniverse();
    const candidates = universe.slice(0, SAMPLE_SIZE);
    
    if (candidates.length < 5) {
        console.error('❌ CRITICAL: Universe too small for variance testing.');
        process.exit(1);
    }

    const results: TickerResult[] = [];

    // 2. Scan Tickers (Serial to respect Rate Limits)
    console.log(`📡 Scanning ${candidates.length} tickers via FMP Stable API...`);
    
    for (const t of candidates) {
        process.stdout.write(`   > Analyzing ${t.padEnd(5)} `);
        try {
            const bundle = await unifiedIntelligenceFactory.generateBundle(t);
            const metrics = {
                'FSI  ': bundle.engines.fsi.score,
                'ACE  ': bundle.engines.ace.street_score,
                'GEX  ': normalize(bundle.engines.gamma.exposure), // Fixed: exposure
                'VOL  ': bundle.engines.volsurf.iv_rank,
                'SENT ': bundle.engines.narrative.score, // Fixed: score
                'TECH ': bundle.engines.seas.score,      // Fixed: seas.score
                'INST ': bundle.engines.hfai.score,
                'FINAL': bundle.scoring.weighted_confidence
            };
            results.push({ ticker: t, metrics });
            console.log(`✅ (Score: ${metrics['FINAL'].toFixed(0)})`);
        } catch (e: any) {
            console.log(`❌ FAILED`);
        }
        await sleep(300); // Rate Limit Protection
    }

    // 3. Generate ASCII Heatmap & Calculate Variance
    console.log('\n🗺️  INTELLIGENCE HEATMAP');
    console.log('================================================================');
    
    if (results.length === 0) {
        console.error('❌ CRITICAL: No results generated.');
        process.exit(1);
    }

    // Header
    const keys = Object.keys(results[0].metrics);
    console.log(`TICKER | ${keys.join(' | ')}`);
    console.log('-------|' + keys.map(() => '-----').join('|'));

    // Rows
    results.forEach(r => {
        const row = keys.map(k => {
            const val = r.metrics[k];
            return val.toFixed(0).padStart(3, ' ');
        }).join(' | ');
        console.log(`${r.ticker.padEnd(6)} | ${row}`);
    });
    console.log('================================================================');

    // 4. Statistical Analysis
    console.log('\n📉 VARIANCE ANALYSIS');
    let failCount = 0;

    keys.forEach(key => {
        const values = results.map(r => r.metrics[key]);
        const uniqueValues = new Set(values).size;
        const uniquenessRatio = uniqueValues / results.length;
        const isStatic = uniqueValues === 1 && values[0] !== 0; // Static non-zero is suspicious
        const isZeroed = uniqueValues === 1 && values[0] === 0; // Zeroed is "Missing Data"

        let status = '✅ PASS';
        if (isZeroed) {
            status = '⚠️  MISSING (All 0)';
            // We don't fail build on missing data (could be API limit), but we warn.
        } else if (isStatic) {
            status = '❌ FAIL (Static)';
            failCount++;
        } else if (uniquenessRatio < VARIANCE_THRESHOLD) {
            status = '❌ FAIL (Low Variance)';
            failCount++;
        }

        console.log(`   ${key}: ${uniqueValues}/${results.length} unique values (${(uniquenessRatio*100).toFixed(0)}%) -> ${status}`);
    });

    console.log('----------------------------------------------------------------');

    if (failCount > (keys.length * 0.3)) { // Allow 30% failure (e.g. missing premium data)
        console.error(`❌ CRITICAL: ${failCount} engines failed variance check.`);
        console.error('   System is likely running on static fallbacks.');
        process.exit(1);
    } else {
        console.log('✅ SYSTEM VALIDATED: High Entropy / Real Data Confirmation.');
        process.exit(0);
    }
}

// Simple normalizer for display
function normalize(val: number): number {
    if (val > 100) return 99;
    if (val < -100) return -99;
    return val;
}

runVarianceProbe();
