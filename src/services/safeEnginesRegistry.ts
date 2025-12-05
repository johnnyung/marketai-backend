/**
 * SAFE ENGINES REGISTRY
 * ---------------------
 * Aggregates all A6 (orphan) engines into a single importable object
 * to ensure they are reachable by the compiler and runtime.
 */

import aiPatternDetectionEngine from "./aiPatternDetectionEngine.js";
import buybackMomentumEngine from "./buybackMomentumEngine.js";
import consensusEngine from "./consensusEngine.js";
import correlationAnalysisService from "./correlationAnalysisService.js";
import crossAssetCorrelationEngine from "./crossAssetCorrelationEngine.js";
import cryptoIntelligence from "./cryptoIntelligence.js";
import cryptoIntelligenceService from "./cryptoIntelligenceService.js";
import earningsIntelligence from "./earningsIntelligence.js";
import enhancedIntelligenceService from "./enhancedIntelligenceService.js";
import enhancedPoliticalIntelligence from "./enhancedPoliticalIntelligence.js";
import institutionalIntelligence from "./institutionalIntelligence.js";
import intelligenceCache from "./intelligenceCache.js";
import macroIntelligence from "./macroIntelligence.js";
import reverseScannerService from "./reverseScannerService.js";
import volatilityNormalizerService from "./volatilityNormalizerService.js";
import whaleContrarianService from "./whaleContrarianService.js";

export const SafeEngines = {
    aiPatternDetection: aiPatternDetectionEngine,
    buybackMomentum: buybackMomentumEngine,
    consensus: consensusEngine,
    correlationAnalysis: correlationAnalysisService,
    crossAssetCorrelation: crossAssetCorrelationEngine,
    cryptoIntel: cryptoIntelligence,
    cryptoIntelService: cryptoIntelligenceService,
    earningsIntel: earningsIntelligence,
    enhancedIntel: enhancedIntelligenceService,
    enhancedPolitical: enhancedPoliticalIntelligence,
    institutionalIntel: institutionalIntelligence,
    intelCache: intelligenceCache,
    macroIntel: macroIntelligence,
    reverseScanner: reverseScannerService,
    volatilityNormalizer: volatilityNormalizerService,
    whaleContrarian: whaleContrarianService
};

export default SafeEngines;
