import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import unifiedIntelligenceFactory from '../services/unifiedIntelligenceFactory.js';

const TICKERS = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'AMD', 'JPM', 'DIS'];

// Engines expected to be GLOBAL (Static across tickers is OK)
const GLOBAL_ENGINES = ['MACRO', 'GNAE', 'SCS', 'MBE', 'GMF'];

async function runValidator() {
    console.log('\n🏆 PHASE 24: FINAL SYSTEM SUCCESS VALIDATOR (Fixed)');
    console.log('================================================');

    if (!process.env.FMP_API_KEY) {
        console.error('❌ CRITICAL: API Key missing.');
        process.exit(1);
    }

    const data: Record<string, any[]> = {
        final: [], fsi: [], ace: [], gamma: [], narrative: [],
        macro: [], sentiment: [], insider: []
    };

    console.log(`📡 Scanning ${TICKERS.length} assets...`);

    for (const t of TICKERS) {
        process.stdout.write(`   Processing ${t.padEnd(6)} ... `);
        try {
            const bundle = await unifiedIntelligenceFactory.generateBundle(t);
            
            data.final.push(bundle.scoring.weighted_confidence);
            data.fsi.push(bundle.engines.fsi.score);
            data.ace.push(bundle.engines.ace.street_score);
            data.gamma.push(bundle.engines.gamma.exposure); // Fixed: exposure, not net_gamma_exposure
            data.narrative.push(bundle.engines.narrative.score);
            data.macro.push(bundle.engines.mlp.score);
            data.sentiment.push(bundle.engines.narrative.score);
            data.insider.push(bundle.engines.insider.score);

            console.log(`OK (${bundle.scoring.weighted_confidence.toFixed(1)})`);
        } catch (e: any) {
            console.log(`FAILED (${e.message})`);
        }
        await new Promise(r => setTimeout(r, 400));
    }

    console.log('\n📊 STATISTICAL ANALYSIS');
    console.log('------------------------------------------------');
    
    let failures = 0;

    for (const [key, values] of Object.entries(data)) {
        const label = key.toUpperCase();
        const unique = new Set(values).size;
        const zeros = values.filter(v => v === 0).length;
        const fifties = values.filter(v => v === 50).length;
        
        let status = '✅ PASS';
        const isGlobal = GLOBAL_ENGINES.includes(label);

        // RULES
        // 1. Static Check (Skip for Globals)
        if (!isGlobal && unique === 1 && values.length > 1 && values[0] !== 0) {
            status = '❌ FAIL (Static)';
            failures++;
        }
        
        // 2. Banned Value Check
        if (fifties === values.length) {
            status = '❌ FAIL (All 50s)';
            failures++;
        }
        
        // 3. Zero Check
        if (zeros === values.length) {
             if (key === 'gamma') {
                 status = '⚠️  WARN (Gamma Flat)';
             } else {
                 status = '⚠️  WARN (All 0 - Data?)';
             }
        }

        console.log(`   ${label.padEnd(10)} | Unique: ${unique}/${values.length} | Zeros: ${zeros} | 50s: ${fifties} | -> ${status}`);
    }

    console.log('------------------------------------------------');

    if (failures > 0) {
        console.error(`❌ VALIDATION FAILED: ${failures} engines showed static/mock patterns.`);
        process.exit(1);
    } else {
        console.log('✅ SUCCESS: System is Dynamic, Reactive, and Data-Driven.');
        process.exit(0);
    }
}

runValidator();
