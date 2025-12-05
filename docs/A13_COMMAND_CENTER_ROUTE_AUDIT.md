# A13 COMMAND CENTER ROUTE AUDIT (SAFE MODE)

Project root: `/Users/animationtech/Desktop/marketai-backend`

Scanned routes directory: `src/routes`

This report is **read-only**: no runtime wiring was changed.

## File: `src/routes/analyticsRoutes.ts`

- **Routes**:
  - `GET /job-status/:type`
  - `POST /comprehensive`
  - `POST /hunt-catalysts`
  - `GET /hunter-history`
  - `GET /pattern-matches`
- **Service calls**: _(none of the watched services detected)_

---

## File: `src/routes/brain.ts`

- **Routes**:
  - `POST /full-cycle`
  - `GET /status`
- **Service calls**:
  - `unifiedIntelligenceFactory.js`
  - `unifiedIntelligenceFactory.generateTopPicks`

---

## File: `src/routes/dailyIntelligence.ts`

- **Routes**:
  - `POST /daily/generate`
  - `GET /daily/latest`
  - `GET /daily/recent`
  - `GET /daily/:date`
- **Service calls**: _(none of the watched services detected)_

---

## File: `src/routes/dailyIntelligenceRoutes.ts`

- **Routes**:
  - `POST /daily/generate`
  - `GET /daily/latest`
  - `GET /daily/:date`
  - `GET /daily/recent`
- **Service calls**: _(none of the watched services detected)_

---

## File: `src/routes/eventIntelligenceRoutes.ts`

- **Routes**:
  - `POST /analyze`
  - `GET /recent`
- **Service calls**: _(none of the watched services detected)_

---

## File: `src/routes/intelligence.ts`

- **Routes**:
  - `POST /generate-signals`
  - `GET /signals`
  - `GET /ai-tips`
  - `POST /analyze-patterns`
  - `GET /pattern-insights`
  - `GET /success-probability/:ticker`
  - `GET /analyze/:ticker`
  - `POST /analyze-batch`
  - `GET /performance-analysis`
  - `POST /update-prices`
  - `POST /update-ticker/:ticker`
  - `GET /update-status`
  - `GET /health`
- **Service calls**: _(none of the watched services detected)_

---

## File: `src/routes/intelligenceThreadsRoutes.ts`

- **Routes**:
  - `GET /`
  - `POST /detect`
  - `GET /active`
  - `GET /:id`
  - `PUT /:id/status`
- **Service calls**: _(none of the watched services detected)_

---

## File: `src/routes/opportunities.ts`

- **Routes**:
  - `GET /signals`
  - `GET /summary`
  - `GET /recent`
  - `POST /ingest`
- **Service calls**:
  - `tradingOpportunitiesService.js`
  - `tradingOpportunitiesService.generateTradingSignals`

---

## File: `src/routes/paperTradingRoutes.ts`

- **Routes**:
  - `GET /status`
  - `POST /run-cycle`
- **Service calls**: _(none of the watched services detected)_

---

## File: `src/routes/socialIntelligenceRoutes.ts`

- **Routes**:
  - `POST /ingest`
  - `GET /trending`
  - `GET /ticker/:symbol`
  - `GET /summary`
- **Service calls**: _(none of the watched services detected)_

---

## File: `src/routes/tradingOpportunities.ts`

- **Routes**:
  - `GET /signals`
  - `GET /signal/:ticker`
- **Service calls**:
  - `tradingOpportunitiesService.js`
  - `tradingOpportunitiesService.generateTradingSignals`
  - `tradingOpportunitiesService.generateTickerSignal`

---

## File: `src/routes/tradingOpportunitiesRoutes.ts`

- **Routes**:
  - `GET /signals`
  - `GET /signal/:ticker`
- **Service calls**:
  - `tradingOpportunitiesService.js`
  - `tradingOpportunitiesService.generateTradingSignals`
  - `tradingOpportunitiesService.generateTickerSignal`

---

## File: `src/routes/unifiedIntelligenceRoutes.ts`

- **Routes**:
  - `GET /alerts`
  - `GET /alerts/critical`
  - `POST /analyze`
  - `GET /signal-strength`
  - `POST /alerts/:id/acknowledge`
  - `GET /performance`
- **Service calls**: _(none of the watched services detected)_

---

