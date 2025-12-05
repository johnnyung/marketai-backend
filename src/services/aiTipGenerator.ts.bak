// src/services/aiTipGenerator.ts
// ============================================================
// AI Tip Generator (Stable FMP ONLY) — Aggressive 1% Mode
// ============================================================

import pool from "../db/index.js";
import { getStablePrice } from "./fmpStableService.js";

type Trend = "uptrend" | "downtrend" | "sideways";

interface ActiveTipRow {
  id: number;
  ticker: string;
  entry_price: number;
}

const PCT_THRESHOLD = 0.01; // 1%
const DEFAULT_CONFIDENCE = 75; // stored as integer (75 = 75%)
const DEFAULT_EXPECTED_GAIN = 15; // %
const DEFAULT_TIER = "gold";
const CONFIDENCE_MODEL = "v2-aggressive-1pct";

const DEMO_TICKERS = ["AAPL", "MSFT", "NVDA", "GOOGL"]; // you can swap to your universe later

function computePctDiff(newPrice: number, oldPrice: number): number {
  if (!oldPrice || oldPrice <= 0) return 1;
  return Math.abs(newPrice - oldPrice) / oldPrice;
}

function determineTrend(newPrice: number, oldPrice?: number): Trend {
  if (!oldPrice || oldPrice <= 0) return "sideways";
  const diff = (newPrice - oldPrice) / oldPrice;
  if (diff > 0.01) return "uptrend";
  if (diff < -0.01) return "downtrend";
  return "sideways";
}

function buildReasoning(
  ticker: string,
  price: number,
  trend: Trend,
  expectedGainPct: number
): string {
  return [
    `Aggressive intraday-style signal for ${ticker}.`,
    `Stable price reference around $${price.toFixed(2)} with a ${trend} bias.`,
    `Targeting ~${expectedGainPct}% upside using MarketAI's internal pattern engine and Stable FMP quotes.`,
  ].join(" ");
}

function buildCatalysts(ticker: string, trend: Trend) {
  return [
    {
      type: "technical",
      description: `Short-term ${trend} momentum pattern detected in ${ticker}.`,
    },
    {
      type: "liquidity",
      description: `Stable feed confirms tradable liquidity in ${ticker} under current market regime.`,
    },
  ];
}

function inferTimeframe(): string {
  // Aggressive swing / day-trading feel
  return "1–4 weeks";
}

function inferRiskScore(trend: Trend): number {
  // Simple stub you can make smarter later
  switch (trend) {
    case "uptrend":
      return 70; // slightly lower risk when riding strength
    case "downtrend":
      return 80; // higher risk fading weakness
    default:
      return 75; // neutral chop
  }
}

function inferValuationBand(): string {
  // Placeholder – later you can plug in PE / PS / etc.
  return "neutral";
}

async function getLatestActiveTip(ticker: string): Promise<ActiveTipRow | null> {
  const { rows } = await pool.query(
    `
    SELECT id, ticker, entry_price
    FROM ai_stock_tips
    WHERE ticker = $1 AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1
  `,
    [ticker]
  );

  if (!rows.length) return null;

  const row = rows[0];
  const entryPriceNum =
    typeof row.entry_price === "number"
      ? row.entry_price
      : parseFloat(row.entry_price);

  return {
    id: row.id,
    ticker: row.ticker,
    entry_price: entryPriceNum,
  };
}

async function updateTipPrice(id: number, newPrice: number): Promise<void> {
  await pool.query(
    `
    UPDATE ai_stock_tips
    SET
      current_price     = $1,
      current_pnl       = $1 - entry_price,
      current_pnl_pct   = CASE
                            WHEN entry_price > 0
                            THEN (($1 - entry_price) / entry_price) * 100
                            ELSE 0
                          END,
      last_price_update = NOW()
    WHERE id = $2
  `,
    [newPrice, id]
  );
}

async function closeTipAsSuperseded(
  tip: ActiveTipRow,
  newPrice: number
): Promise<void> {
  await pool.query(
    `
    UPDATE ai_stock_tips
    SET
      status            = 'superseded',
      exit_price        = $1,
      exit_date         = NOW(),
      final_pnl         = $1 - entry_price,
      final_pnl_pct     = CASE
                            WHEN entry_price > 0
                            THEN (($1 - entry_price) / entry_price) * 100
                            ELSE NULL
                          END,
      current_price     = $1,
      current_pnl       = $1 - entry_price,
      current_pnl_pct   = CASE
                            WHEN entry_price > 0
                            THEN (($1 - entry_price) / entry_price) * 100
                            ELSE 0
                          END,
      last_price_update = NOW(),
      exit_reason       = COALESCE(exit_reason, 'superseded_by_new_signal')
    WHERE id = $2
  `,
    [newPrice, tip.id]
  );
}

async function insertNewTip(ticker: string, price: number, trend: Trend) {
  const timeframe = inferTimeframe();
  const riskScore = inferRiskScore(trend);
  const valuationBand = inferValuationBand();
  const expectedGain = DEFAULT_EXPECTED_GAIN;
  const priceTarget = price * (1 + expectedGain / 100);

  const reasoning = buildReasoning(ticker, price, trend, expectedGain);
  const catalysts = buildCatalysts(ticker, trend);
  const entryReason =
    "Aggressive 1% deviation threshold met; new intraday-style signal created.";

  const signalsPayload = {
    source: "aiTipGenerator:v2-aggressive",
    trend,
    mode: "1pct-threshold",
  };

  const exitStrategy =
    "Tight risk-managed swing; monitor intraday volatility and exit if thesis breaks or stop-loss is hit.";

  const { rows } = await pool.query(
    `
    INSERT INTO ai_stock_tips (
      ticker,
      action,
      confidence,
      reasoning,
      price_target,
      timeframe,
      signals,
      status,
      entry_price,
      current_price,
      tier,
      expected_gain_percent,
      risk_score,
      catalysts,
      exit_strategy,
      trend,
      valuation_band,
      confidence_model,
      entry_reason
    )
    VALUES (
      $1,                      -- ticker
      'buy',                   -- action
      $2,                      -- confidence
      $3,                      -- reasoning
      $4,                      -- price_target
      $5,                      -- timeframe
      $6,                      -- signals (jsonb)
      'active',                -- status
      $7,                      -- entry_price
      $7,                      -- current_price
      $8,                      -- tier
      $9,                      -- expected_gain_percent
      $10,                     -- risk_score
      $11,                     -- catalysts (jsonb)
      $12,                     -- exit_strategy
      $13,                     -- trend
      $14,                     -- valuation_band
      $15,                     -- confidence_model
      $16                      -- entry_reason
    )
    RETURNING
      id,
      ticker,
      entry_price,
      confidence,
      status,
      tier,
      expected_gain_percent,
      created_at
  `,
    [
      ticker,
      DEFAULT_CONFIDENCE,
      reasoning,
      priceTarget,
      timeframe,
      signalsPayload,
      price,
      DEFAULT_TIER,
      expectedGain,
      riskScore,
      catalysts,
      exitStrategy,
      trend,
      valuationBand,
      CONFIDENCE_MODEL,
      entryReason,
    ]
  );

  return rows[0];
}

export default {
  /**
   * Main entry: aggressive 1% deviation engine
   *
   * - For each ticker:
   *   - Fetch Stable FMP price
   *   - If active tip exists:
   *       - If < 1% diff → just update current_price / PnL
   *       - If ≥ 1% diff → close old as "superseded" and insert new signal
   *   - If no active tip → insert new signal
   *
   * Returns:
   *   { insertedTips: [...], updatedTips: [...] }
   */
  async generateComprehensiveTips() {
    console.log(
      "⚡ AI Tip Generator (Stable FMP, aggressive 1% mode) running..."
    );

    const insertedTips: any[] = [];
    const updatedTips: any[] = [];

    for (const ticker of DEMO_TICKERS) {
      try {
        const price = await getStablePrice(ticker);

        if (!price) {
          console.warn(`⚠️ No stable price resolved for ${ticker}`);
          continue;
        }

        const latest = await getLatestActiveTip(ticker);
        const trend = determineTrend(price, latest?.entry_price);

        if (latest) {
          const pctDiff = computePctDiff(price, latest.entry_price);

          // < 1% move → just update current price / PnL
          if (pctDiff < PCT_THRESHOLD) {
            await updateTipPrice(latest.id, price);
            updatedTips.push({
              ticker,
              id: latest.id,
              price,
              pctDiff,
              mode: "price_update_only",
            });
            continue;
          }

          // ≥ 1% move → close old + insert new
          await closeTipAsSuperseded(latest, price);
        }

        const inserted = await insertNewTip(ticker, price, trend);
        insertedTips.push(inserted);
      } catch (err) {
        console.error(`❌ Error generating tip for ${ticker}`, err);
      }
    }

    console.log(
      `✅ Tip generation complete. Inserted=${insertedTips.length} Updated=${updatedTips.length}`
    );

    return { insertedTips, updatedTips };
  },
};
