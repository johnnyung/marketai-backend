import fs from 'fs';
import path from 'path';

const MIN_BYTES = 600;

const CRITICAL_SERVICES = [
  // INGESTION CORTEX
  'marketDataService.ts',
  'fmpService.ts',
  'tiingoService.ts',
  'yahooFinanceService.ts',
  'supplyChainShockMapper.ts',
  'etfLeakageService.ts',
  'priceStabilityService.ts',
  'gammaExposureService.ts',
  'insiderIntentService.ts',
  'narrativePressureService.ts',
  'currencyShockService.ts',
  'divergenceDetectorService.ts',
  'multiAgentValidationService.ts',
  'regimeTransitionService.ts',
  'pairsTradingService.ts',
  'riskConstraintService.ts',
  'marketSentimentService.ts',
  'lazarusService.ts',
  'masterIngestionService.ts',

  // DEEP BRAIN
  'crossSignalConsensusEngine.ts',
  'catalystHunterService.ts',
  'earningsMomentumService.ts',
  'insiderPatternService.ts',
  'historicalRAGEngine.ts',
  'tribunalService.ts',
  'neuralChatService.ts',
  'confidenceLedgerService.ts',

  // EXECUTION AGENT
  'tradeManagementService.ts',
  'paperTradingService.ts',
  'portfolioManagerService.ts',
  'portfolioIntelligenceEngine.ts',
  'schemaHarmonizerService.ts'
];

function runPSSL_VLEE() {
  console.log("🧬 PSSL + VLEE: Verifying critical engine files & logic density...");

  const servicesDir = path.join(process.cwd(), 'src', 'services');
  let missing = 0;
  let weak = 0;

  for (const file of CRITICAL_SERVICES) {
    const fullPath = path.join(servicesDir, file);
    if (!fs.existsSync(fullPath)) {
      console.error(`  ❌ MISSING: ${file}`);
      missing++;
      continue;
    }

    const stats = fs.statSync(fullPath);
    if (stats.size < MIN_BYTES) {
      console.warn(`  ⚠️  LOGIC ATROPHY: ${file} (${stats.size} bytes < ${MIN_BYTES})`);
      weak++;
    } else {
      console.log(`  ✅ OK: ${file} (${stats.size} bytes)`);
    }
  }

  if (missing > 0) {
    console.error(`🚨 PSSL/VLEE FAILURE: ${missing} critical service files missing.`);
    process.exit(1);
  }

  if (weak > 0) {
    console.warn(`⚠️ PSSL/VLEE WARNING: ${weak} files look too small; review for logic shrinkage.`);
  } else {
    console.log("✅ PSSL/VLEE PASSED: All critical services present with healthy logic density.");
  }
}

runPSSL_VLEE();
