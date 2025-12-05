# A10 — Catalyst Hunter Wiring Audit

Generated at: 2025-12-03T18:20:52.886Z

This report cross-references:
- **A9 Source Ingestion Registry** (`sourceIngestionRegistry.ts`)
- **A7 Diagnostic Engines Registry** (`diagnosticEnginesRegistry.ts`)
- **Catalyst-related files** in `src/services`, `src/routes`, `src/controllers`.

It does *not* change any runtime wiring — it is purely observational.

---

## 1. Pipelines vs Catalyst References

| Pipeline ID | Collector File | Service File | Engine File | Referenced in Catalyst? | Catalyst Files |
|-------------|----------------|-------------|------------|--------------------------|----------------|
| `crypto_pipeline` | `src/services/collectors/cryptoCollector.ts` | `src/services/cryptoIntelligenceService.ts` | `src/services/cryptoStockCorrelationService.ts` | YES | src/services/sourceIngestionRegistry.ts |
| `whale_pipeline` | `src/services/collectors/whaleCollector.ts` | `src/services/smartMoneyHeatmapService.ts` | `src/services/whaleContrarianService.ts` | YES | src/services/sourceIngestionRegistry.ts |
| `macro_pipeline` | `src/services/collectors/fredCollector.ts` | `src/services/economicDataService.ts` | `` | YES | src/services/sourceIngestionRegistry.ts |
| `insider_pipeline` | `src/services/collectors/insiderCollector.ts` | `src/services/governmentDataService.ts` | `src/services/hedgeFund13FEngine.ts` | YES | src/services/sourceIngestionRegistry.ts |
| `geopolitical_pipeline` | `` | `src/services/geopoliticalIntelligenceService.ts` | `` | YES | src/services/sourceIngestionRegistry.ts |
| `social_sentiment_pipeline` | `` | `src/services/expandedSocialService.ts` | `` | YES | src/services/sourceIngestionRegistry.ts |
| `iv_microstructure_pipeline` | `` | `src/services/ivNavigatorService.ts` | `src/services/microstructureService.ts` | YES | src/services/sourceIngestionRegistry.ts |
| `retail_explanation_pipeline` | `` | `src/services/retailInterpretabilityService.ts` | `` | YES | src/services/sourceIngestionRegistry.ts |
| `market_data_pipeline` | `` | `src/services/marketDataService.ts` | `` | YES | src/services/sourceIngestionRegistry.ts |

---

## 2. Diagnostic Engines vs Catalyst References

_No diagnostic engines found in diagnosticEnginesRegistry.ts_

---

## 3. Catalyst-Related Files Scanned

The following files were scanned as “catalyst-related” (name or contents matched keywords like `catalyst`, `hunter`, `opportunit`, `brain`, `radar`):

- `src/services/agentReliabilityService.ts`
- `src/services/aiTickerExtractor.ts`
- `src/services/analysisService.ts`
- `src/services/autonomousAlertService.ts`
- `src/services/beneficiaryRouterService.ts`
- `src/services/blindSpotDetector.ts`
- `src/services/catalystHunterService.ts`
- `src/services/comprehensiveBusinessAnalysis.ts`
- `src/services/confidenceRecalibrationService.ts`
- `src/services/correlationHunterService.ts`
- `src/services/dailySummaryService.ts`
- `src/services/earningsDriftService.ts`
- `src/services/edgarService.ts`
- `src/services/enhancedDeepDiveService.ts`
- `src/services/executiveSummaryService.ts`
- `src/services/intelligenceThreadsService.ts`
- `src/services/jobManagerService.ts`
- `src/services/multiAgentValidationService.ts`
- `src/services/neuralChatService.ts`
- `src/services/newsImpactEngine.ts`
- `src/services/optionsRadarService.ts`
- `src/services/patternRecognitionService.ts`
- `src/services/performanceAnalysisService.ts`
- `src/services/portfolioIntelligenceEngine.ts`
- `src/services/predictionLoggerService.ts`
- `src/services/researchAgentService.ts`
- `src/services/retailInterpretabilityService.ts`
- `src/services/reverseArbitrageService.ts`
- `src/services/reverseScannerService.ts`
- `src/services/schemaHarmonizerService.ts`
- `src/services/selfImprovementService.ts`
- `src/services/shadowRotationService.ts`
- `src/services/signalGeneratorService.ts`
- `src/services/signalNormalizer.ts`
- `src/services/sourceIngestionRegistry.ts`
- `src/services/storyModeService.ts`
- `src/services/systemStabilityService.ts`
- `src/services/titanHunterService.ts`
- `src/services/tradeArchitectService.ts`
- `src/services/tradingOpportunitiesRoutes.ts`
- `src/services/tradingOpportunitiesService.ts`
- `src/services/unifiedIntelligenceFactory.ts`
- `src/services/wdiwaAttributionService.ts`
- `src/services/whaleContrarianService.ts`
- `src/routes/analyticsRoutes.ts`
- `src/routes/brain.ts`
- `src/routes/correlationRoutes.ts`
- `src/routes/eventIntelligenceRoutes.ts`
- `src/routes/health.ts`
- `src/routes/intelligence.ts`
- `src/routes/opportunities.ts`
- `src/routes/tradingOpportunities.ts`
- `src/routes/tradingOpportunitiesRoutes.ts`
