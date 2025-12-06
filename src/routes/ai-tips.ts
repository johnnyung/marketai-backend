// src/routes/ai-tips.ts
import express from "express";
import { pool } from "../db/index.js";
import aiTipGenerator from "../services/aiTipGenerator.js";

const router = express.Router();

// GET /api/ai-tips/active
router.get("/active", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `
      SELECT
        id,
        ticker,
        entry_price,
        current_price,
        confidence,
        status,
        tier,
        expected_gain_percent,
        current_pnl,
        current_pnl_pct,
        created_at,
        last_price_update
      FROM ai_stock_tips
      WHERE status = 'active'
      ORDER BY created_at DESC
    `
    );

    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error("❌ Error fetching active AI tips", err);
    return res.status(500).json({ success: false, error: "internal_error" });
  }
});

// POST /api/ai-tips/generate
router.post("/generate", async (req, res) => {
  try {
    const result = await aiTipGenerator.generateComprehensiveTips();

    // For compatibility with your existing frontend / curl tests:
    // "data" returns only *newly inserted* tips.
    return res.json({
      success: true,
      data: result.insertedTips,
      meta: {
        updated: result.updatedTips,
      },
    });
  } catch (err) {
    console.error("❌ Error generating AI tips", err);
    return res.status(500).json({ success: false, error: "internal_error" });
  }
});

// GET /api/ai-tips/stats
router.get("/stats", async (req, res) => {
  try {
    const [totalTips, openPositions, closedPositions, avgConfidence] =
      await Promise.all([
        pool.query(`SELECT COUNT(*) AS count FROM ai_stock_tips`),
        pool.query(
          `SELECT COUNT(*) AS count FROM ai_stock_tips WHERE status = 'active'`
        ),
        pool.query(
          `SELECT COUNT(*) AS count FROM ai_stock_tips WHERE status <> 'active'`
        ),
        pool.query(
          `SELECT AVG(confidence)::numeric(10,2) AS avg_confidence FROM ai_stock_tips`
        ),
      ]);

    return res.json({
      success: true,
      data: {
        total_tips: totalTips.rows[0]?.count ?? "0",
        open_positions: openPositions.rows[0]?.count ?? "0",
        closed_positions: closedPositions.rows[0]?.count ?? "0",
        avg_confidence: avgConfidence.rows[0]?.avg_confidence ?? null,
      },
    });
  } catch (err) {
    console.error("❌ Error fetching AI tip stats", err);
    return res.status(500).json({ success: false, error: "internal_error" });
  }
});

// GET /api/ai-tips/by-tier/:tier
router.get("/by-tier/:tier", async (req, res) => {
  const tier = req.params.tier;

  try {
    const { rows } = await pool.query(
      `
      SELECT
        id,
        ticker,
        entry_price,
        current_price,
        confidence,
        status,
        tier,
        expected_gain_percent,
        current_pnl,
        current_pnl_pct,
        created_at,
        last_price_update
      FROM ai_stock_tips
      WHERE status = 'active'
        AND tier ILIKE $1
      ORDER BY created_at DESC
    `,
      [tier]
    );

    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error("❌ Error fetching AI tips by tier", err);
    return res.status(500).json({ success: false, error: "internal_error" });
  }
});

// NEW: GET /api/ai-tips/live/:ticker
router.get("/live/:ticker", async (req, res) => {
  const ticker = req.params.ticker.toUpperCase();

  try {
    const { rows } = await pool.query(
      `
      SELECT
        id,
        ticker,
        entry_price,
        current_price,
        current_pnl,
        current_pnl_pct,
        confidence,
        status,
        tier,
        expected_gain_percent,
        risk_score,
        timeframe,
        catalysts,
        trend,
        valuation_band,
        created_at,
        last_price_update
      FROM ai_stock_tips
      WHERE ticker = $1
        AND status = 'active'
      ORDER BY created_at DESC
      LIMIT 1
    `,
      [ticker]
    );

    if (!rows.length) {
      return res
        .status(404)
        .json({ success: false, error: "no_active_tip_for_ticker" });
    }

    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error("❌ Error fetching live AI tip", err);
    return res.status(500).json({ success: false, error: "internal_error" });
  }
});

// NEW: GET /api/ai-tips/history/:ticker
router.get("/history/:ticker", async (req, res) => {
  const ticker = req.params.ticker.toUpperCase();

  try {
    const { rows } = await pool.query(
      `
      SELECT
        id,
        ticker,
        entry_price,
        current_price,
        confidence,
        status,
        tier,
        expected_gain_percent,
        final_pnl,
        final_pnl_pct,
        created_at,
        exit_price,
        exit_date,
        exit_reason
      FROM ai_stock_tips
      WHERE ticker = $1
      ORDER BY created_at DESC
      LIMIT 200
    `,
      [ticker]
    );

    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error("❌ Error fetching AI tip history", err);
    return res.status(500).json({ success: false, error: "internal_error" });
  }
});

// NEW: GET /api/ai-tips/open
router.get("/open", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `
      SELECT
        id,
        ticker,
        entry_price,
        current_price,
        confidence,
        status,
        tier,
        expected_gain_percent,
        current_pnl,
        current_pnl_pct,
        created_at,
        last_price_update
      FROM ai_stock_tips
      WHERE status = 'active'
      ORDER BY created_at DESC
    `
    );

    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error("❌ Error fetching open AI tips", err);
    return res.status(500).json({ success: false, error: "internal_error" });
  }
});

// NEW: GET /api/ai-tips/overview
router.get("/overview", async (_req, res) => {
  try {
    const [
      totalTips,
      openPositions,
      closedPositions,
      avgConfidence,
      winners,
      losers,
      sectorDist,
    ] = await Promise.all([
      pool.query(`SELECT COUNT(*) AS count FROM ai_stock_tips`),
      pool.query(
        `SELECT COUNT(*) AS count FROM ai_stock_tips WHERE status = 'active'`
      ),
      pool.query(
        `SELECT COUNT(*) AS count FROM ai_stock_tips WHERE status <> 'active'`
      ),
      pool.query(
        `SELECT AVG(confidence)::numeric(10,2) AS avg_confidence FROM ai_stock_tips`
      ),
      pool.query(
        `SELECT COUNT(*) AS count FROM ai_stock_tips WHERE final_pnl > 0`
      ),
      pool.query(
        `SELECT COUNT(*) AS count FROM ai_stock_tips WHERE final_pnl < 0`
      ),
      pool.query(
        `
        SELECT
          COALESCE(sector, 'Unknown') AS sector,
          COUNT(*) AS count
        FROM ai_stock_tips
        GROUP BY COALESCE(sector, 'Unknown')
        ORDER BY count DESC
      `
      ),
    ]);

    return res.json({
      success: true,
      data: {
        total_tips: totalTips.rows[0]?.count ?? "0",
        open_positions: openPositions.rows[0]?.count ?? "0",
        closed_positions: closedPositions.rows[0]?.count ?? "0",
        avg_confidence: avgConfidence.rows[0]?.avg_confidence ?? null,
        winners: winners.rows[0]?.count ?? "0",
        losers: losers.rows[0]?.count ?? "0",
        sector_distribution: sectorDist.rows,
      },
    });
  } catch (err) {
    console.error("❌ Error fetching AI tip overview", err);
    return res.status(500).json({ success: false, error: "internal_error" });
  }
});

export default router;
