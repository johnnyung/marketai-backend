# MarketAI Engine & Config Orphan Matrix (A6 SAFE MODE)

Generated: 2025-12-03T17:29:05.620Z

This report lists **engine-like** modules (services, engines, brains, detectors, analyzers)
and classifies them as:

- `IN_USE` — Already imported somewhere in src (not orphan).
- `SAFE_CANDIDATE` — Looks safe, orphan, no legacy FMP patterns, exports something.
- `UNSAFE` — Orphan or problematic (no exports and/or legacy FMP usage).

Summary:

- Total engine-like files scanned: 69
- SAFE_CANDIDATE (eligible for wiring): 16
- UNSAFE (needs rewrite or deprecation): 5

---

| File | Purpose (Inferred) | Status | Orphan? | Exports | Legacy FMP? | Notes |
|------|--------------------|--------|---------|---------|-------------|-------|
| `src/services/analysisService.ts` | Misc / Engine-like module | `IN_USE` | `false` | `default` | `false` | Imported by: src/routes/analysisRoutes.ts |
| `src/services/analystConsensusEngine.ts` | Misc / Engine-like module | `IN_USE` | `false` | `default` | `false` | Imported by: src/scripts/test_ace.ts, src/services/unifiedIntelligenceFactory.ts |
| `src/services/collectors/whaleCollector.ts` | Whale / Large flows | `IN_USE` | `false` | `named` | `false` | Imported by: src/services/masterIngestionService.ts |
| `src/services/comprehensiveBusinessAnalysis.ts` | Misc / Engine-like module | `IN_USE` | `false` | `default` | `false` | Imported by: src/routes/intelligence.ts |
| `src/services/comprehensiveDataEngine.ts` | Misc / Engine-like module | `IN_USE` | `false` | `default` | `false` | Imported by: src/routes/analyticsRoutes.ts, src/schedulers/comprehensiveDataScheduler.ts, src/scripts/audit/autonomy_check.ts ... |
| `src/services/corporateActionsEngine.ts` | Misc / Engine-like module | `IN_USE` | `false` | `default` | `false` | Imported by: src/scripts/test_cae.ts |
| `src/services/crossSignalConsensusEngine.ts` | Misc / Engine-like module | `IN_USE` | `false` | `default` | `false` | Imported by: src/scripts/audit/deep_brain_check.ts, src/scripts/audit/deep_brain_stress.ts, src/scripts/audit/deep_brain_wiring.ts ... |
| `src/services/dailyIntelligenceService.ts` | Misc / Engine-like module | `IN_USE` | `false` | `default` | `false` | Imported by: src/routes/dailyIntelligence.ts, src/routes/dailyIntelligenceRoutes.ts |
| `src/services/deepValuationEngine.ts` | Misc / Engine-like module | `IN_USE` | `false` | `default` | `false` | Imported by: src/scripts/test_dve.ts, src/services/unifiedIntelligenceFactory.ts |
| `src/services/divergenceDetectorService.ts` | Misc / Engine-like module | `IN_USE` | `false` | `default` | `false` | Imported by: src/routes/divergenceRoutes.ts, src/scripts/audit/full_stack_integrity.ts, src/scripts/audit/pssl_vlee_scan.ts ... |
| `src/services/evolutionEngine.ts` | Misc / Engine-like module | `IN_USE` | `false` | `default` | `false` | Imported by: src/routes/metaRoutes.ts, src/scripts/selfEvolving_full_test.ts, src/scripts/test_documentation.ts ... |
| `src/services/fundamentalAnalysisService.ts` | Misc / Engine-like module | `IN_USE` | `false` | `default` | `false` | Imported by: src/routes/fundamentalsRoutes.ts, src/services/unifiedIntelligenceFactory.ts |
| `src/services/geopoliticalIntelligenceService.ts` | Geopolitical / Conflict | `IN_USE` | `false` | `default` | `false` | Imported by: src/services/globalRiskService.ts |
| `src/services/globalEtfUniverseEngine.ts` | Misc / Engine-like module | `IN_USE` | `false` | `default` | `false` | Imported by: src/scripts/run_global_discovery.ts |
| `src/services/globalMacroForecastService.ts` | Macro / Economic signal | `IN_USE` | `false` | `default` | `false` | Imported by: src/routes/brain.ts, src/scripts/test_gmf.ts, src/services/analysisService.ts ... |
| `src/services/globalNewsAttentionEngine.ts` | Misc / Engine-like module | `IN_USE` | `false` | `default` | `false` | Imported by: src/scripts/test_gnae.ts, src/services/unifiedIntelligenceFactory.ts |
| `src/services/hedgeFund13FEngine.ts` | Misc / Engine-like module | `IN_USE` | `false` | `default` | `false` | Imported by: src/scripts/test_hfai.ts, src/services/unifiedIntelligenceFactory.ts |
| `src/services/hedgeFundPatternEngine.ts` | Misc / Engine-like module | `IN_USE` | `false` | `default` | `false` | Imported by: src/scripts/test_hapde.ts |
| `src/services/historicalRAGEngine.ts` | Misc / Engine-like module | `IN_USE` | `false` | `default` | `false` | Imported by: src/scripts/audit/pssl_vlee_scan.ts |
| `src/services/ingestion/optionsIngestionService.ts` | Options / Derivatives | `IN_USE` | `false` | `default` | `false` | Imported by: src/routes/ingestionRoutes.ts |
| `src/services/ingestion/whaleIngestionService.ts` | Whale / Large flows | `IN_USE` | `false` | `default` | `false` | Imported by: src/routes/ingestionRoutes.ts |
| `src/services/insiderPatternEngine.ts` | Misc / Engine-like module | `IN_USE` | `false` | `default` | `false` | Imported by: src/scripts/test_ipe.ts |
| `src/services/institutionalFlowEngine.ts` | Misc / Engine-like module | `IN_USE` | `false` | `default` | `false` | Imported by: src/scripts/test_ife.ts, src/services/unifiedIntelligenceFactory.ts |
| `src/services/intelligenceThreadsService.ts` | Misc / Engine-like module | `IN_USE` | `false` | `default` | `false` | Imported by: src/routes/comprehensiveAnalysisRoutes.ts, src/routes/intelligenceThreadsRoutes.ts |
| `src/services/liquidityTrapService.ts` | Liquidity / Flow | `IN_USE` | `false` | `default` | `false` | Imported by: src/scripts/test_neural_link.ts |
| `src/services/macroLiquidityPulseEngine.ts` | Macro / Economic signal | `IN_USE` | `false` | `default` | `false` | Imported by: src/scripts/test_mlp.ts, src/services/unifiedIntelligenceFactory.ts |
| `src/services/macroLiquidityService.ts` | Macro / Economic signal | `IN_USE` | `false` | `default` | `false` | Imported by: src/scripts/audit/ingestion_matrix.ts, src/services/systemStabilityService.ts |
| `src/services/macroRegimeService.ts` | Macro / Economic signal | `IN_USE` | `false` | `default` | `false` | Imported by: src/scripts/test_gmf.ts, src/services/consensusEngine.ts, src/services/hedgingService.ts ... |
| `src/services/marketBreadthEngine.ts` | Misc / Engine-like module | `IN_USE` | `false` | `default` | `false` | Imported by: src/scripts/test_mbe.ts, src/services/unifiedIntelligenceFactory.ts |
| `src/services/newsImpactEngine.ts` | Misc / Engine-like module | `IN_USE` | `false` | `default` | `false` | Imported by: src/scripts/test_nie.ts, src/services/masterIngestionService.ts |
| `src/services/optionsFlowIntelligenceEngine.ts` | Options / Derivatives | `IN_USE` | `false` | `default` | `false` | Imported by: src/scripts/test_ofi.ts |
| `src/services/optionsRadarService.ts` | Options / Derivatives | `IN_USE` | `false` | `default` | `false` | Imported by: src/scripts/test_neural_link.ts |
| `src/services/performanceAnalysisService.ts` | Misc / Engine-like module | `IN_USE` | `false` | `default` | `false` | Imported by: src/routes/intelligence.ts |
| `src/services/politicalIntelligenceService.ts` | Misc / Engine-like module | `IN_USE` | `false` | `default` | `false` | Imported by: src/scripts/audit/ingestion_matrix.ts, src/services/geopoliticalIntelligenceService.ts, src/services/globalRiskService.ts |
| `src/services/portfolioIntelligenceEngine.ts` | Misc / Engine-like module | `IN_USE` | `false` | `default` | `false` | Imported by: src/scripts/audit/pssl_vlee_scan.ts, src/scripts/audit/test_portfolio_analysis.ts, src/scripts/audit/vlee_scan.ts ... |
| `src/services/regimeTransitionService.ts` | Misc / Engine-like module | `IN_USE` | `false` | `default` | `false` | Imported by: src/routes/regimeRoutes.ts, src/scripts/audit/pssl_vlee_scan.ts, src/scripts/audit/regression_scan.ts ... |
| `src/services/seasonalityEngine.ts` | Misc / Engine-like module | `IN_USE` | `false` | `default` | `false` | Imported by: src/scripts/test_seas.ts, src/services/unifiedIntelligenceFactory.ts |
| `src/services/shadowLiquidityService.ts` | Liquidity / Flow | `IN_USE` | `false` | `default` | `false` | Imported by: src/routes/shadowLiquidityRoutes.ts, src/scripts/audit/full_stack_integrity.ts, src/scripts/audit/ingestion_matrix.ts ... |
| `src/services/signalGeneratorService.ts` | Misc / Engine-like module | `IN_USE` | `false` | `default` | `false` | Imported by: src/routes/intelligence.ts, src/scripts/seed_daily_picks.ts, src/scripts/selfEvolving_full_test.ts ... |
| `src/services/socialIntelligenceIntegration.ts` | Misc / Engine-like module | `IN_USE` | `false` | `default` | `false` | Imported by: src/routes/socialIntelligenceRoutes.ts, src/routes/socialRoutes.ts |
| `src/services/supplyChainStressEngine.ts` | Supply-chain / Logistics | `IN_USE` | `false` | `default` | `false` | Imported by: src/scripts/test_scs.ts, src/services/unifiedIntelligenceFactory.ts |
| `src/services/technicalAnalysis.ts` | Misc / Engine-like module | `IN_USE` | `false` | `default` | `false` | Imported by: src/routes/technical.ts, src/routes/technicalRoutes.ts |
| `src/services/unifiedIntelligenceEngine.ts` | Misc / Engine-like module | `IN_USE` | `false` | `default` | `false` | Imported by: src/routes/unifiedIntelligenceRoutes.ts |
| `src/services/unifiedIntelligenceFactory.ts` | Misc / Engine-like module | `IN_USE` | `false` | `default` | `false` | Imported by: src/routes/aiTips.ts, src/routes/brain.ts, src/routes/debug/top3Debug.ts ... |
| `src/services/unusualOptionsEngine.ts` | Options / Derivatives | `IN_USE` | `false` | `default` | `false` | Imported by: src/routes/options.ts, src/scripts/test_uoa.ts, src/services/unifiedIntelligenceFactory.ts |
| `src/services/volatilityRegimeEngine.ts` | Volatility / Risk regime | `IN_USE` | `false` | `default` | `false` | Imported by: src/scripts/test_vre.ts, src/services/unifiedIntelligenceFactory.ts |
| `src/services/volatilityShockAwarenessService.ts` | Volatility / Risk regime | `IN_USE` | `false` | `default` | `false` | Imported by: src/scripts/learning_engine_v12_validator.ts, src/scripts/test_vsa.ts |
| `src/services/volatilitySurfaceEngine.ts` | Volatility / Risk regime | `IN_USE` | `false` | `default` | `false` | Imported by: src/scripts/test_volsurf.ts, src/services/unifiedIntelligenceFactory.ts |
| `src/services/aiPatternDetectionEngine.ts` | Misc / Engine-like module | `SAFE_CANDIDATE` | `true` | `default` | `false` | Not imported anywhere in src (orphan). |
| `src/services/buybackMomentumEngine.ts` | Misc / Engine-like module | `SAFE_CANDIDATE` | `true` | `default` | `false` | Not imported anywhere in src (orphan). |
| `src/services/consensusEngine.ts` | Misc / Engine-like module | `SAFE_CANDIDATE` | `true` | `default` | `false` | Not imported anywhere in src (orphan). |
| `src/services/correlationAnalysisService.ts` | Inter-market / Correlation | `SAFE_CANDIDATE` | `true` | `default` | `false` | Not imported anywhere in src (orphan). |
| `src/services/crossAssetCorrelationEngine.ts` | Inter-market / Correlation | `SAFE_CANDIDATE` | `true` | `default` | `false` | Not imported anywhere in src (orphan). |
| `src/services/cryptoIntelligence.ts` | Misc / Engine-like module | `SAFE_CANDIDATE` | `true` | `default` | `false` | Not imported anywhere in src (orphan). |
| `src/services/cryptoIntelligenceService.ts` | Misc / Engine-like module | `SAFE_CANDIDATE` | `true` | `default` | `false` | Not imported anywhere in src (orphan). |
| `src/services/earningsIntelligence.ts` | Misc / Engine-like module | `SAFE_CANDIDATE` | `true` | `default` | `false` | Not imported anywhere in src (orphan). |
| `src/services/enhancedIntelligenceService.ts` | Misc / Engine-like module | `SAFE_CANDIDATE` | `true` | `default` | `false` | Not imported anywhere in src (orphan). |
| `src/services/enhancedPoliticalIntelligence.ts` | Misc / Engine-like module | `SAFE_CANDIDATE` | `true` | `default` | `false` | Not imported anywhere in src (orphan). |
| `src/services/institutionalIntelligence.ts` | Misc / Engine-like module | `SAFE_CANDIDATE` | `true` | `default` | `false` | Not imported anywhere in src (orphan). |
| `src/services/intelligenceCache.ts` | Misc / Engine-like module | `SAFE_CANDIDATE` | `true` | `default` | `false` | Not imported anywhere in src (orphan). |
| `src/services/macroIntelligence.ts` | Macro / Economic signal | `SAFE_CANDIDATE` | `true` | `default` | `false` | Not imported anywhere in src (orphan). |
| `src/services/reverseScannerService.ts` | Misc / Engine-like module | `SAFE_CANDIDATE` | `true` | `default` | `false` | Not imported anywhere in src (orphan). |
| `src/services/volatilityNormalizerService.ts` | Volatility / Risk regime | `SAFE_CANDIDATE` | `true` | `default` | `false` | Not imported anywhere in src (orphan). |
| `src/services/whaleContrarianService.ts` | Whale / Large flows | `SAFE_CANDIDATE` | `true` | `default` | `false` | Not imported anywhere in src (orphan). |
| `src/services/metaLearning/blindSpotDetector.ts` | Misc / Engine-like module | `UNSAFE` | `false` | `none` | `false` | Imported by: src/services/metaLearning/evolutionLoopController.ts / No exported functions/classes detected. |
| `src/services/metaLearning/driftDetector.ts` | Misc / Engine-like module | `UNSAFE` | `false` | `none` | `false` | Imported by: src/services/metaLearning/evolutionLoopController.ts / No exported functions/classes detected. |
| `src/services/metaLearning/errorClassificationEngine.ts` | Misc / Engine-like module | `UNSAFE` | `false` | `none` | `false` | Imported by: src/services/metaLearning/evolutionLoopController.ts / No exported functions/classes detected. |
| `src/services/metaLearning/signalWeightOptimizer.ts` | Misc / Engine-like module | `UNSAFE` | `false` | `none` | `false` | Imported by: src/services/metaLearning/evolutionLoopController.ts / No exported functions/classes detected. |
| `src/services/signalNormalizer.ts` | Misc / Engine-like module | `UNSAFE` | `false` | `none` | `false` | Imported by: src/services/crossSignalConsensusEngine.ts / No exported functions/classes detected. |
