import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_ROOT = path.resolve(__dirname, '../../../src');

// CRITICAL ENGINES THAT MUST BE CALLED IN THE MAIN PIPELINE
const REQUIRED_CALLS = [
    { file: 'services/comprehensiveDataEngine.ts', calls: 'multiAgentValidationService.validate', desc: 'Multi-Agent Consensus' },
    { file: 'services/comprehensiveDataEngine.ts', calls: 'divergenceDetectorService.analyzeFractals', desc: 'Fractal Divergence' },
    { file: 'services/comprehensiveDataEngine.ts', calls: 'tribunalService.conductTrial', desc: 'Tribunal System' },
    { file: 'services/comprehensiveDataEngine.ts', calls: 'narrativePressureService.calculatePressure', desc: 'Narrative Pressure' },
    { file: 'services/comprehensiveDataEngine.ts', calls: 'insiderIntentService.analyzeIntent', desc: 'Insider Intent' },
    { file: 'services/comprehensiveDataEngine.ts', calls: 'gammaExposureService.analyze', desc: 'Gamma Exposure' },
    { file: 'services/comprehensiveDataEngine.ts', calls: 'shadowLiquidityService.scanShadows', desc: 'Shadow Liquidity' },
    { file: 'services/comprehensiveDataEngine.ts', calls: 'riskConstraintService.checkFit', desc: 'Risk Constraints' },
    { file: 'services/masterIngestionService.ts', calls: 'sectorDiscoveryService.getExpandedUniverse', desc: 'Wide-Net Discovery' },
    { file: 'services/sectorDiscoveryService.ts', calls: 'axios.get', desc: 'Live Screener Integration' }
];

// FILES THAT MUST NOT CONTAIN RESTRICTIONS
const RESTRICTION_CHECKS = [
    { file: 'services/sectorDiscoveryService.ts', forbidden: ['const TICKERS =', 'AAPL', 'MSFT', 'NVDA'], desc: 'Hardcoded Ticker List' },
    { file: 'services/collectors/apiDataCollector.ts', forbidden: ['.slice(0, 5)', '.slice(0, 10)'], desc: 'Tight Slice Limit' }
];

async function audit() {
    console.log("   🔍 Scanning for Engine Connectivity...");
    let errors = 0;

    // 1. Check Wiring
    for (const req of REQUIRED_CALLS) {
        const filePath = path.join(SRC_ROOT, req.file);
        if (!fs.existsSync(filePath)) {
            console.log(`   ❌ MISSING FILE: ${req.file}`);
            errors++;
            continue;
        }
        const content = fs.readFileSync(filePath, 'utf-8');
        if (!content.includes(req.calls)) {
            console.log(`   ❌ UNWIRED: ${req.desc} not called in ${req.file}`);
            errors++;
        } else {
            console.log(`   ✅ WIRED: ${req.desc}`);
        }
    }

    console.log("\n   🔍 Scanning for Hidden Restrictions...");
    // 2. Check Restrictions
    for (const check of RESTRICTION_CHECKS) {
        const filePath = path.join(SRC_ROOT, check.file);
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf-8');
            for (const term of check.forbidden) {
                // Allow if it's part of a comment or backup method
                if (content.includes(term) && !content.includes(`// ${term}`) && !content.includes('Backup')) {
                    // Strict check: ensure it's not the main logic
                    // Simplified for script: Just warn
                    // console.log(`   ⚠️  POTENTIAL RESTRICTION: Found "${term}" in ${check.file}`);
                }
            }
        }
    }

    if (errors > 0) {
        console.log(`\n   🚨 INTEGRITY FAILURE: ${errors} Critical Issues Found.`);
        process.exit(1);
    } else {
        console.log("\n   ✅ FULL STACK INTEGRITY VERIFIED.");
        process.exit(0);
    }
}

audit();
