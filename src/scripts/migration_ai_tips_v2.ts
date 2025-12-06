// src/scripts/migration_ai_tips_v2.ts
// ============================================================
// AI Tip V2 Migration
// - Adds trend / valuation_band / confidence_model / entry_reason
// - Adds index on (ticker, status)
// ============================================================

import { pool } from "../db/index.js";

async function run() {
  console.log("🚀 Running migration_ai_tips_v2...");

  await pool.query(`
    ALTER TABLE ai_stock_tips
      ADD COLUMN IF NOT EXISTS trend VARCHAR(20),
      ADD COLUMN IF NOT EXISTS valuation_band VARCHAR(50),
      ADD COLUMN IF NOT EXISTS confidence_model VARCHAR(50),
      ADD COLUMN IF NOT EXISTS entry_reason TEXT
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_tips_ticker_status
      ON ai_stock_tips (ticker, status)
  `);

  console.log("✅ migration_ai_tips_v2 completed.");
}

run()
  .catch((err) => {
    console.error("❌ migration_ai_tips_v2 failed", err);
    process.exit(1);
  })
  .finally(() => {
    // pg Pool will keep process alive unless we end it
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    pool.end();
  });
