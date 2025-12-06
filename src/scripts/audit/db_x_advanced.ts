import { pool } from "../../db/index.js";
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();


async function runDBX() {
  console.log("💾 DB-X: Deep Schema, Performance, & Continuity Audit...");
  const client = await pool.connect();

  try {
    // 1. Table existence
    const requiredTables = [
      'ai_stock_tips',
      'trades',
      'digest_entries',
      'historical_events',
      'crypto_stock_predictions',
      'unified_intelligence_alerts',
      'user_portfolio_holdings',
      'confidence_ledger',
      'system_status'
    ];

    for (const table of requiredTables) {
      const res = await client.query(`SELECT to_regclass($1) AS exists`, [table]);
      if (!res.rows[0].exists) {
        console.error(`  ❌ MISSING TABLE: ${table}`);
      } else {
        console.log(`  ✅ Table Exists: ${table}`);
      }
    }

    // 2. Simple index check
    const idxRes = await client.query(`
      SELECT tablename, indexname
      FROM pg_indexes
      WHERE tablename IN ('ai_stock_tips', 'digest_entries');
    `);
    if (idxRes.rows.length === 0) {
      console.warn("  ⚠️ No indexes found for ai_stock_tips or digest_entries.");
    } else {
      console.log("  ✅ Indexes present for key intelligence tables.");
    }

    // 3. Write latency test
    const start = Date.now();
    await client.query('BEGIN');
    await client.query(`
      INSERT INTO system_status (source_id, status, message, last_updated)
      VALUES ('db_x_audit', 'testing', 'DB-X Latency Check', NOW())
      ON CONFLICT (source_id) DO UPDATE SET last_updated = NOW();
    `);
    await client.query('COMMIT');
    const latency = Date.now() - start;

    console.log(`  ⏱  Write Latency: ${latency}ms`);
    if (latency > 500) {
      console.warn("  ⚠️ DB Latency above 500ms; investigate performance.");
    } else {
      console.log("  ✅ DB Latency within acceptable bounds.");
    }

    // 4. Time-series continuity
    const tsRes = await client.query(`
      SELECT COUNT(*) AS recent
      FROM digest_entries
      WHERE created_at > NOW() - INTERVAL '24 hours';
    `);
    const recent = parseInt(tsRes.rows[0].recent || '0', 10);
    if (recent === 0) {
      console.warn("  ⚠️ No digest_entries in last 24 hours. Ingestion may be stale.");
    } else {
      console.log(`  ✅ ${recent} digest_entries in last 24h (continuity OK).`);
    }

    console.log("✅ DB-X Advanced Audit Completed.");

  } catch (e: any) {
    console.error("❌ DB-X Audit FAILURE:", e.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runDBX();
