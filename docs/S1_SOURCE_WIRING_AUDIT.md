# S1 Source Wiring Audit

Generated at: `2025-12-03T18:07:37.210Z`

Mode: **SAFE** (read-only on TS/JS; only this report + helper script created).

This report maps external data **sources** → **collectors/services** → **engines** → **routes/UI**, and flags:
- Sources that are **collected but never reach an engine**
- Engines that **never reach a route/UI**
- Config files that are **never imported** (orphan configs)

---

## Source: FMP Stable `(fmp_stable)`

**Heuristic patterns:** `financialmodelingprep.com/stable`, `/stable/`, `fmpStableWrapper`

**Files touching this source:** 32

- **Collectors**: 2
  - `src/services/collectors/cryptoCollector.ts`, `src/services/collectors/whaleCollector.ts`
- **Services**: 12
  - `src/services/cryptoIntelligenceService.ts`, `src/services/cryptoStockCorrelationService.ts`, `src/services/dataVerificationService.ts`, `src/services/fmpService.ts`, `src/services/historicalDataService.ts`, `src/services/insiderPatternService.ts`, `src/services/ivNavigatorService.ts`, `src/services/marketDataService.ts`, `src/services/microstructureService.ts`, `src/services/priceFallbackService.ts`, ...
- **Engines**: 0
- **Routes**: 0
- **Scripts**: 14
  - `src/scripts/configure_data_layers.ts`, `src/scripts/debug_fmp.ts`, `src/scripts/fmp_autodiscover.ts`, `src/scripts/fmp_url_investigator.ts`, `src/scripts/repair_price_service.ts`, `src/scripts/system_diagnostic.ts`, `src/scripts/test_fmp_access.ts`, `src/scripts/test_fmp_full.ts`, `src/scripts/test_fmp_full_revised.ts`, `src/scripts/test_fmp_new.ts`, ...
- **Configs**: 0

### Wiring Health

- Files that **never reach a route/UI** (via imports): 32
  - `src/scripts/configure_data_layers.ts`, `src/scripts/debug_fmp.ts`, `src/scripts/fmp_autodiscover.ts`, `src/scripts/fmp_url_investigator.ts`, `src/scripts/repair_price_service.ts`, `src/scripts/system_diagnostic.ts`, `src/scripts/test_fmp_access.ts`, `src/scripts/test_fmp_full.ts`, `src/scripts/test_fmp_full_revised.ts`, `src/scripts/test_fmp_new.ts`, ...
- Files that **never reach an engine** (via imports): 32
  - `src/scripts/configure_data_layers.ts`, `src/scripts/debug_fmp.ts`, `src/scripts/fmp_autodiscover.ts`, `src/scripts/fmp_url_investigator.ts`, `src/scripts/repair_price_service.ts`, `src/scripts/system_diagnostic.ts`, `src/scripts/test_fmp_access.ts`, `src/scripts/test_fmp_full.ts`, `src/scripts/test_fmp_full_revised.ts`, `src/scripts/test_fmp_new.ts`, ...

### Potential Orphans

- **Orphan collectors** (no engine, no route): 2
  - `src/services/collectors/cryptoCollector.ts`, `src/services/collectors/whaleCollector.ts`

---

## Source: Reddit `(reddit)`

**Heuristic patterns:** `reddit.com`, `r/stocks`, `RedditCollector`

**Files touching this source:** 6

- **Collectors**: 2
  - `src/services/collectors/RedditCollectorService.ts`, `src/services/collectors/socialCollector.ts`
- **Services**: 2
  - `src/services/collectors/RedditCollectorService.ts`, `src/services/expandedSocialService.ts`
- **Engines**: 0
- **Routes**: 0
- **Scripts**: 1
  - `src/scripts/verify_sources/verify_news_sources.ts`
- **Configs**: 0

### Wiring Health

- Files that **never reach a route/UI** (via imports): 6
  - `src/scripts/verify_sources/verify_news_sources.ts`, `src/services/collectors/RedditCollectorService.ts`, `src/services/collectors/socialCollector.ts`, `src/services/expandedSocialService.ts`, `src/services/providers/newsProvider.ts`, `src/services/socialIntelligenceIntegration.ts`
- Files that **never reach an engine** (via imports): 6
  - `src/scripts/verify_sources/verify_news_sources.ts`, `src/services/collectors/RedditCollectorService.ts`, `src/services/collectors/socialCollector.ts`, `src/services/expandedSocialService.ts`, `src/services/providers/newsProvider.ts`, `src/services/socialIntelligenceIntegration.ts`

### Potential Orphans

- **Orphan collectors** (no engine, no route): 2
  - `src/services/collectors/RedditCollectorService.ts`, `src/services/collectors/socialCollector.ts`

---

## Source: MarketWatch `(marketwatch)`

**Heuristic patterns:** `marketwatch.com`, `MarketWatch`

**Files touching this source:** 4

- **Collectors**: 0
- **Services**: 1
  - `src/services/sentimentService.ts`
- **Engines**: 0
- **Routes**: 0
- **Scripts**: 2
  - `src/scripts/verify_sources/verify_gov_sources_v2.ts`, `src/scripts/verify_sources/verify_news_sources.ts`
- **Configs**: 0

### Wiring Health

- Files that **never reach a route/UI** (via imports): 4
  - `src/scripts/verify_sources/verify_gov_sources_v2.ts`, `src/scripts/verify_sources/verify_news_sources.ts`, `src/services/providers/newsProvider.ts`, `src/services/sentimentService.ts`
- Files that **never reach an engine** (via imports): 4
  - `src/scripts/verify_sources/verify_gov_sources_v2.ts`, `src/scripts/verify_sources/verify_news_sources.ts`, `src/services/providers/newsProvider.ts`, `src/services/sentimentService.ts`

---

## Source: Yahoo Finance `(yahoo_finance)`

**Heuristic patterns:** `feeds.finance.yahoo.com`, `query1.finance.yahoo.com`, `YahooFinance`

**Files touching this source:** 4

- **Collectors**: 0
- **Services**: 1
  - `src/services/yahooFinanceService.ts`
- **Engines**: 0
- **Routes**: 0
- **Scripts**: 2
  - `src/scripts/configure_data_layers.ts`, `src/scripts/verify_tiingo.ts`
- **Configs**: 0

### Wiring Health

- Files that **never reach a route/UI** (via imports): 4
  - `src/scripts/configure_data_layers.ts`, `src/scripts/verify_tiingo.ts`, `src/services/providers/newsProvider.ts`, `src/services/yahooFinanceService.ts`
- Files that **never reach an engine** (via imports): 4
  - `src/scripts/configure_data_layers.ts`, `src/scripts/verify_tiingo.ts`, `src/services/providers/newsProvider.ts`, `src/services/yahooFinanceService.ts`

---

## Source: White House `(white_house)`

**Heuristic patterns:** `whitehouse.gov`, `WhiteHouse`

**Files touching this source:** 5

- **Collectors**: 0
- **Services**: 1
  - `src/services/governmentDataService.ts`
- **Engines**: 0
- **Routes**: 0
- **Scripts**: 3
  - `src/scripts/system_diagnostic.ts`, `src/scripts/verify_sources/verify_gov_sources_v2.ts`, `src/scripts/verify_sources/verify_government_sources.ts`
- **Configs**: 0

### Wiring Health

- Files that **never reach a route/UI** (via imports): 5
  - `src/scripts/system_diagnostic.ts`, `src/scripts/verify_sources/verify_gov_sources_v2.ts`, `src/scripts/verify_sources/verify_government_sources.ts`, `src/services/governmentDataService.ts`, `src/services/providers/govProvider.ts`
- Files that **never reach an engine** (via imports): 5
  - `src/scripts/system_diagnostic.ts`, `src/scripts/verify_sources/verify_gov_sources_v2.ts`, `src/scripts/verify_sources/verify_government_sources.ts`, `src/services/governmentDataService.ts`, `src/services/providers/govProvider.ts`

---

## Source: Crypto (Prices / On-chain) `(crypto)`

**Heuristic patterns:** `cryptoCollector`, `cryptoIntelligenceService`, `stable/crypto/price`, `stable/crypto/profile`

**Files touching this source:** 2

- **Collectors**: 0
- **Services**: 1
  - `src/services/masterIngestionService.ts`
- **Engines**: 1
  - `src/services/safeEnginesRegistry.ts`
- **Routes**: 0
- **Scripts**: 0
- **Configs**: 0

### Wiring Health

- Files that **never reach a route/UI** (via imports): 2
  - `src/services/masterIngestionService.ts`, `src/services/safeEnginesRegistry.ts`
- Files that **never reach an engine** (via imports): 1
  - `src/services/masterIngestionService.ts`

### Potential Orphans

- **Engines not wired to any route/UI**: 1
  - `src/services/safeEnginesRegistry.ts`

---

## Source: Whale / Large-Holder `(whale)`

**Heuristic patterns:** `whaleCollector`, `whale`, `whale_alert`, `whalestats`

**Files touching this source:** 17

- **Collectors**: 1
  - `src/services/collectors/whaleCollector.ts`
- **Services**: 5
  - `src/services/ingestion/whaleIngestionService.ts`, `src/services/masterIngestionService.ts`, `src/services/retailInterpretabilityService.ts`, `src/services/smartMoneyHeatmapService.ts`, `src/services/whaleContrarianService.ts`
- **Engines**: 2
  - `src/services/hedgeFund13FEngine.ts`, `src/services/safeEnginesRegistry.ts`
- **Routes**: 2
  - `src/routes/ingestionRoutes.ts`, `src/routes/systemStatusRoutes.ts`
- **Scripts**: 4
  - `src/scripts/force_seed_status.ts`, `src/scripts/probe_services.ts`, `src/scripts/seed_system_status.ts`, `src/scripts/test_hfai.ts`
- **Configs**: 0

### Wiring Health

- Files that **never reach a route/UI** (via imports): 15
  - `src/scripts/force_seed_status.ts`, `src/scripts/probe_services.ts`, `src/scripts/seed_system_status.ts`, `src/scripts/test_hfai.ts`, `src/services/collectors/whaleCollector.ts`, `src/services/cryptoIntelligence.ts`, `src/services/hedgeFund13FEngine.ts`, `src/services/ingestion/whaleIngestionService.ts`, `src/services/masterIngestionService.ts`, `src/services/retailInterpretabilityService.ts`, ...
- Files that **never reach an engine** (via imports): 15
  - `src/routes/ingestionRoutes.ts`, `src/routes/systemStatusRoutes.ts`, `src/scripts/force_seed_status.ts`, `src/scripts/probe_services.ts`, `src/scripts/seed_system_status.ts`, `src/scripts/test_hfai.ts`, `src/services/collectors/whaleCollector.ts`, `src/services/cryptoIntelligence.ts`, `src/services/ingestion/whaleIngestionService.ts`, `src/services/masterIngestionService.ts`, ...

### Potential Orphans

- **Orphan collectors** (no engine, no route): 1
  - `src/services/collectors/whaleCollector.ts`
- **Engines not wired to any route/UI**: 2
  - `src/services/hedgeFund13FEngine.ts`, `src/services/safeEnginesRegistry.ts`

---

## Source: SEC / EDGAR `(sec_filings)`

**Heuristic patterns:** `sec.gov`, `edgar`, `secFilingsCollector`

**Files touching this source:** 6

- **Collectors**: 1
  - `src/services/collectors/insiderCollector.ts`
- **Services**: 3
  - `src/services/edgarService.ts`, `src/services/executiveVettingService.ts`, `src/services/scheduledIngestionService.ts`
- **Engines**: 0
- **Routes**: 1
  - `src/routes/opportunities.ts`
- **Scripts**: 1
  - `src/scripts/verify_sources/verify_government_sources.ts`
- **Configs**: 0

### Wiring Health

- Files that **never reach a route/UI** (via imports): 5
  - `src/scripts/verify_sources/verify_government_sources.ts`, `src/services/collectors/insiderCollector.ts`, `src/services/edgarService.ts`, `src/services/executiveVettingService.ts`, `src/services/scheduledIngestionService.ts`
- Files that **never reach an engine** (via imports): 6
  - `src/routes/opportunities.ts`, `src/scripts/verify_sources/verify_government_sources.ts`, `src/services/collectors/insiderCollector.ts`, `src/services/edgarService.ts`, `src/services/executiveVettingService.ts`, `src/services/scheduledIngestionService.ts`

### Potential Orphans

- **Orphan collectors** (no engine, no route): 1
  - `src/services/collectors/insiderCollector.ts`

---

## Source: Macro / Fed / Rates `(macro_fed)`

**Heuristic patterns:** `fredapi`, `FRED`, `treasury.gov`, `stable/economic`, `FedRatesCollector`

**Files touching this source:** 8

- **Collectors**: 1
  - `src/services/collectors/fredCollector.ts`
- **Services**: 5
  - `src/services/economicDataService.ts`, `src/services/geopoliticalIntelligenceService.ts`, `src/services/governmentDataService.ts`, `src/services/macroLiquidityService.ts`, `src/services/masterIngestionService.ts`
- **Engines**: 0
- **Routes**: 1
  - `src/routes/systemStatusRoutes.ts`
- **Scripts**: 1
  - `src/scripts/system_diagnostic.ts`
- **Configs**: 0

### Wiring Health

- Files that **never reach a route/UI** (via imports): 7
  - `src/scripts/system_diagnostic.ts`, `src/services/collectors/fredCollector.ts`, `src/services/economicDataService.ts`, `src/services/geopoliticalIntelligenceService.ts`, `src/services/governmentDataService.ts`, `src/services/macroLiquidityService.ts`, `src/services/masterIngestionService.ts`
- Files that **never reach an engine** (via imports): 8
  - `src/routes/systemStatusRoutes.ts`, `src/scripts/system_diagnostic.ts`, `src/services/collectors/fredCollector.ts`, `src/services/economicDataService.ts`, `src/services/geopoliticalIntelligenceService.ts`, `src/services/governmentDataService.ts`, `src/services/macroLiquidityService.ts`, `src/services/masterIngestionService.ts`

### Potential Orphans

- **Orphan collectors** (no engine, no route): 1
  - `src/services/collectors/fredCollector.ts`

---

## Source: Options Flow `(options)`

**Heuristic patterns:** `optionsCollect`, `unusualOptions`, `stable/options-chain`, `stable/options`

**Files touching this source:** 3

- **Collectors**: 0
- **Services**: 0
- **Engines**: 0
- **Routes**: 1
  - `src/routes/options.ts`
- **Scripts**: 1
  - `src/scripts/test_uoa.ts`
- **Configs**: 0

### Wiring Health

- Files that **never reach a route/UI** (via imports): 2
  - `src/scripts/test_uoa.ts`, `src/services/unifiedIntelligenceFactory.ts`
- Files that **never reach an engine** (via imports): 3
  - `src/routes/options.ts`, `src/scripts/test_uoa.ts`, `src/services/unifiedIntelligenceFactory.ts`

---

## Global Orphan Configs

Config files in `src/config` that are never imported by any TS file.

Count: 0

