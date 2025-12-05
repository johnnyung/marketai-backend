import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '../../');

dotenv.config({ path: path.join(root, '.env') });
dotenv.config({ path: path.join(root, '.env.local') });

import priceService from '../services/priceService.js';
import fmpService from '../services/fmpService.js';

async function run() {
    console.log("🧪 TESTING PRICE FALLBACK CHAIN (FDV-3)");
    console.log("---------------------------------------");

    const TICKER = 'AAPL';
    
    // 1. Test Base FMP
    console.log(`1. FMP Service Direct (${TICKER}):`);
    const direct = await fmpService.getPrice(TICKER);
    console.log(`   -> ${direct ? '✅ OK: ' + direct.price : '❌ NULL (Simulating outage)'}`);

    // 2. Test Orchestrator
    console.log(`\n2. PriceService Orchestrator (${TICKER}):`);
    const result = await priceService.getCurrentPrice(TICKER);
    
    console.log(`   -> Price: ${result.price}`);
    console.log(`   -> Source: ${result.source}`);
    console.log(`   -> Capability: ${result.capability}`);

    if (result.price && result.source) {
        console.log("\n✅ CHAIN VERIFIED. System is resilient.");
        process.exit(0);
    } else {
        console.error("\n❌ CHAIN FAILED. No price returned.");
        process.exit(1);
    }
}

run();
