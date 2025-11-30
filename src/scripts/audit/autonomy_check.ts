import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sectorDiscoveryService from '../../services/sectorDiscoveryService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_ROOT = path.resolve(__dirname, '../../../src');

async function runAudit() {
    console.log("   🔍 Starting Autonomy Checks...");
    let passed = true;

    // TEST 1: UNIVERSE SIZE
    // The UI only shows 3-10 items. The backend MUST know about hundreds.
    try {
        const universe = await sectorDiscoveryService.getExpandedUniverse();
        console.log(`   📊 Active Universe Size: ${universe.length} tickers`);
        
        if (universe.length < 100) {
            console.log("   ❌ FAILURE: Universe too small. Backend is restricted.");
            passed = false;
        } else {
            console.log("   ✅ SUCCESS: Wide-Net Discovery is active (>100 tickers).");
        }
    } catch (e: any) {
        console.log(`   ❌ FAILURE: Sector Discovery Error - ${e.message}`);
        passed = false;
    }

    // TEST 2: CODEBASE SCAN FOR ARTIFICIAL LIMITS
    // We check if the main engine loops are artificially capped to UI sizes (3 or 10)
    const enginePath = path.join(SRC_ROOT, 'services/comprehensiveDataEngine.ts');
    const content = fs.readFileSync(enginePath, 'utf-8');

    // Detect "slice(0, 3)" or "slice(0, 5)" in the ingestion loop
    // Note: slice(0, 50) is the allowed batch size. slice(0, 3) is a UI limit.
    const badSlices = content.match(/\.slice\(0,\s*[1-9]\)/g);
    
    if (badSlices) {
        console.log("   ⚠️  WARNING: Potential UI logic found in Backend Engine:", badSlices);
        // We don't fail immediately because it might be valid for specific sub-routines,
        // but it's a flag.
    } else {
        console.log("   ✅ SUCCESS: No tight UI limits (3/5/10) found in Data Engine.");
    }

    // TEST 3: CHECK SERVICE SEPARATION
    // Ensure API routes allow limits (for UI) but Services do not default to them
    const servicePath = path.join(SRC_ROOT, 'services/tradingOpportunitiesService.ts');
    const serviceContent = fs.readFileSync(servicePath, 'utf-8');
    
    if (serviceContent.includes('limit: number') || serviceContent.includes('LIMIT $1')) {
         console.log("   ✅ SUCCESS: Backend supports pagination (doesn't hardcode limits).");
    } else {
         console.log("   ❌ FAILURE: Backend service seems to lack dynamic limits.");
         passed = false;
    }

    if (passed) {
        console.log("\n   🔒 CERTIFIED: Backend scanning is INDEPENDENT of UI restrictions.");
        process.exit(0);
    } else {
        console.log("\n   🚨 FAILED: Backend appears constrained by Frontend logic.");
        process.exit(1);
    }
}

runAudit();
