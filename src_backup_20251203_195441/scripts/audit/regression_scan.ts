import fs from 'fs';
import path from 'path';

// --- THE GOLDEN MANIFEST (v1 -> v113) ---
const MANIFEST = [
    { file: 'services/sectorDiscoveryService.ts', signature: 'getExpandedUniverse', minBytes: 1000 },
    { file: 'services/riskConstraintService.ts', signature: 'checkFit', minBytes: 1500 },
    { file: 'services/pairsTradingService.ts', signature: 'generatePairs', minBytes: 1500 },
    { file: 'services/regimeTransitionService.ts', signature: 'detectRegime', minBytes: 2000 },
    { file: 'services/shadowLiquidityService.ts', signature: 'scanShadows', minBytes: 2000 },
    { file: 'services/marketSentimentService.ts', signature: 'getThermometer', minBytes: 2000 },
    { file: 'services/divergenceDetectorService.ts', signature: 'analyzeFractals', minBytes: 3000 },
    { file: 'services/multiAgentValidationService.ts', signature: 'validate', minBytes: 2500 },
    { file: 'services/currencyShockService.ts', signature: 'analyzeShock', minBytes: 2000 },
    { file: 'services/narrativePressureService.ts', signature: 'calculatePressure', minBytes: 2000 },
    { file: 'services/insiderIntentService.ts', signature: 'analyzeIntent', minBytes: 2000 },
    { file: 'services/gammaExposureService.ts', signature: 'analyze', minBytes: 2000 },
    { file: 'services/priceStabilityService.ts', signature: 'analyzeStability', minBytes: 1500 },
    { file: 'services/sectorCorrelationService.ts', signature: 'detectRegimeShifts', minBytes: 1500 },
    { file: 'services/supplyChainShockMapper.ts', signature: 'mapImpact', minBytes: 1500 },
    { file: 'services/etfLeakageService.ts', signature: 'detectLeakage', minBytes: 1000 },
    { file: 'services/newsEmbeddingService.ts', signature: 'processEntry', minBytes: 1000 },
    { file: 'services/crossSignalConsensusEngine.ts', signature: 'calculateScore', minBytes: 2000 },
    { file: 'services/comprehensiveDataEngine.ts', signature: 'processHypotheses', minBytes: 5000 },
    { file: 'services/tribunalService.ts', signature: 'conductTrial', minBytes: 1500 },
    { file: 'services/catalystHunterService.ts', signature: 'huntInsiderPlays', minBytes: 2000 },
    { file: 'services/masterIngestionService.ts', signature: 'runFullIngestion', minBytes: 3000 },
    { file: 'services/lazarusService.ts', signature: 'fetchOrResurrect', minBytes: 1000 },
    { file: 'services/sourceGuardService.ts', signature: 'runHealthCheck', minBytes: 1000 },
    { file: 'server.ts', signature: 'app.use', minBytes: 3000 }
];

async function audit() {
    console.log("   🔍 Scanning File System for Regressions...");
    console.log("--------------------------------------------------------------------------------------");
    console.log("%-40s | %-10s | %-10s | %-10s | %s", "FEATURE", "EXISTS", "DENSITY", "LOGIC", "STATUS");
    console.log("--------------------------------------------------------------------------------------");

    let missing = 0;
    let shrunken = 0;
    let broken = 0;

    for (const item of MANIFEST) {
        const filePath = path.join(process.cwd(), 'src', item.file);
        const name = path.basename(item.file, '.ts');
        
        let exists = false;
        let density = '---';
        let logic = '---';
        let status = 'UNKNOWN';

        if (fs.existsSync(filePath)) {
            exists = true;
            const content = fs.readFileSync(filePath, 'utf-8');
            const size = content.length;
            
            if (size >= item.minBytes) {
                density = 'PASS';
            } else {
                density = `FAIL (${size}b)`;
                shrunken++;
            }

            if (content.includes(item.signature)) {
                logic = 'PASS';
            } else {
                logic = 'MISSING';
                broken++;
            }

            if (exists && density === 'PASS' && logic === 'PASS') {
                status = '✅ HEALTHY';
            } else {
                status = '❌ REGRESSION';
            }

        } else {
            missing++;
            status = '❌ DELETED';
        }

        console.log(
            "%-40s | %-10s | %-10s | %-10s | %s",
            name, exists ? 'YES' : 'NO', density, logic, status
        );
    }

    console.log("--------------------------------------------------------------------------------------");
    
    if (missing > 0 || shrunken > 0 || broken > 0) {
        console.log(`🚨 REGRESSION DETECTED:`);
        console.log(`   - Missing Files: ${missing}`);
        console.log(`   - Atrophied Logic: ${shrunken}`);
        console.log(`   - Broken Interfaces: ${broken}`);
        process.exit(1);
    } else {
        console.log(`✅ NO REGRESSIONS FOUND. All ${MANIFEST.length} Core Features Intact.`);
        process.exit(0);
    }
}

audit();
