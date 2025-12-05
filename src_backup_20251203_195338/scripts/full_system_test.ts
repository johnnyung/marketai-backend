import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import unifiedIntelligenceFactory from '../services/unifiedIntelligenceFactory.js';
import fmpService from '../services/fmpService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function runFullTest() {
    console.log('🧪 STARTING FULL SYSTEM SELF-TEST');
    console.log('==========================================');

    // 1. Connectivity
    console.log('1️⃣  Checking FMP Connection...');
    const health = await fmpService.checkConnection();
    if (!health.success) {
        console.error('❌ FMP Connection Failed. Check API Key.');
        process.exit(1);
    }
    console.log('✅ FMP Connected.');

    // 2. Ingestion Capabilities
    console.log('\n2️⃣  Checking Data Endpoints...');
    const caps = fmpService.capabilities;
    console.log('   Current Capabilities:', JSON.stringify(caps));

    // 3. Intelligence Generation
    console.log('\n3️⃣  Generating Test Bundle (AAPL)...');
    try {
        const bundle = await unifiedIntelligenceFactory.generateBundle('AAPL');
        console.log(`✅ Bundle Generated. Score: ${bundle.scoring.weighted_confidence}`);
        
        const engines = Object.keys(bundle.engines);
        console.log(`   Engines Active: ${engines.length}`);
        
        const failedEngines = engines.filter(k => (bundle.engines as any)[k].fallback_used);
        if (failedEngines.length > 0) {
            console.warn(`⚠️  Engines using Fallback: ${failedEngines.join(', ')}`);
        }
    } catch (e: any) {
        console.error('❌ Bundle Generation Failed:', e.message);
        process.exit(1);
    }

    console.log('\n==========================================');
    console.log('🎉 SYSTEM IS OPERATIONAL.');
}

runFullTest();
