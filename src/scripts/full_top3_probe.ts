import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Environment Loader
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import unifiedIntelligenceFactory from '../services/unifiedIntelligenceFactory.js';
import tickerUniverseService from '../services/tickerUniverseService.js';
import { IntelligenceBundle } from '../types/intelligenceBundle.js';

// Helper: Delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runSerialProbe() {
    console.log('\n🐢 STARTING SERIAL TOP 3 PROBE (Rate-Limit Safe)');
    console.log('================================================');

    // 1. Get Universe
    let universe: string[] = [];
    try {
        universe = await tickerUniverseService.getUniverse();
    } catch (e) {
        console.error('❌ Failed to load universe:', e);
        process.exit(1);
    }

    // Limit to 10 for validation
    const candidates = universe.slice(0, 10);
    console.log(`🌌 Universe Size: ${universe.length}`);
    console.log(`🎯 Scanning Targets: ${candidates.join(', ')}`);
    console.log('------------------------------------------------');

    const results: IntelligenceBundle[] = [];

    // 2. Serial Loop
    for (const ticker of candidates) {
        process.stdout.write(`⏳ Analyzing ${ticker.padEnd(6)} ... `);
        
        // Rate Limit Delay
        await delay(800);

        let bundle: IntelligenceBundle | null = null;

        try {
            // Attempt 1
            bundle = await unifiedIntelligenceFactory.generateBundle(ticker);
        } catch (e: any) {
            // Attempt 2 (Retry)
            process.stdout.write(`⚠️  Retry... `);
            await delay(1200);
            try {
                bundle = await unifiedIntelligenceFactory.generateBundle(ticker);
            } catch (retryErr: any) {
                console.log(`❌ FAILED`);
                continue; // Skip to next ticker
            }
        }

        if (bundle) {
            results.push(bundle);
            console.log(`✅ Score: ${bundle.scoring.weighted_confidence.toFixed(1)}`);
        }
    }

    // 3. Sort & Rank
    console.log('------------------------------------------------');
    console.log('📊 Ranking...');
    results.sort((a, b) => b.scoring.weighted_confidence - a.scoring.weighted_confidence);
    const top3 = results.slice(0, 3);

    // 4. Display Official Results
    console.log('\n🏆 TOP 3 PICKS');
    console.log('================================================');

    if (top3.length === 0) {
        console.warn('⚠️  No bundles generated. Check FMP API Key/Quota.');
    }

    top3.forEach((bundle, index) => {
        const plan = bundle.trade_plan;
        console.log(`\n${index + 1}. ${bundle.ticker} — ${bundle.scoring.weighted_confidence.toFixed(0)} — ${bundle.scoring.final_conviction}`);
        console.log(`   Reason: ${bundle.scoring.reasons[0] || 'N/A'}`);
        if (plan) {
            console.log(`   Plan: Buy @ $${plan.entry_primary.toFixed(2)} | Target: $${plan.take_profit_1.toFixed(2)}`);
        }
    });

    console.log('\n✅ Validation Complete.');
    process.exit(0);
}

runSerialProbe();
