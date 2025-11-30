import fs from 'fs';
import path from 'path';
const CRITICAL_ENGINES = [
    'gammaExposureService.ts', 'insiderIntentService.ts', 'narrativePressureService.ts',
    'currencyShockService.ts', 'divergenceDetectorService.ts', 'priceStabilityService.ts',
    'sectorCorrelationService.ts', 'supplyChainShockMapper.ts', 'etfLeakageService.ts',
    'newsEmbeddingService.ts', 'lazarusService.ts', 'masterIngestionService.ts',
    'crossSignalConsensusEngine.ts', 'catalystHunterService.ts', 'earningsMomentumService.ts',
    'insiderPatternService.ts', 'tribunalService.ts', 'neuralChatService.ts',
    'multiAgentValidationService.ts', 'marketSentimentService.ts', 'comprehensiveDataEngine.ts',
    'tradeManagementService.ts', 'paperTradingService.ts', 'portfolioManagerService.ts',
    'corporateQualityService.ts', 'riskConstraintService.ts', 'pairsTradingService.ts',
    'portfolioIntelligenceEngine.ts', 'regimeTransitionService.ts'
];
const MIN_BYTES = 600;
async function run() {
    console.log("🔒 VLEE: Scanning Logic Density...");
    let failed = 0;
    const servicesDir = path.join(process.cwd(), 'src', 'services');
    for (const file of CRITICAL_ENGINES) {
        const filePath = path.join(servicesDir, file);
        if (!fs.existsSync(filePath)) { console.error(`❌ MISSING: ${file}`); failed++; continue; }
        const stats = fs.statSync(filePath);
        if (stats.size < MIN_BYTES) { console.error(`⚠️ ATROPHY: ${file} (${stats.size} bytes)`); failed++; }
    }
    process.exit(failed > 0 ? 1 : 0);
}
run();
