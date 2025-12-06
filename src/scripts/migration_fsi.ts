import { pool } from "../db/index.js";
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();


async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS financial_health_snapshots (
        id SERIAL PRIMARY KEY,
        ticker VARCHAR(20),
        quality_score NUMERIC,
        earnings_risk_score NUMERIC,
        traffic_light VARCHAR(20), -- 'GREEN', 'YELLOW', 'RED'
        analysis_data JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Index for fast retrieval
    await client.query(`CREATE INDEX IF NOT EXISTS idx_fsi_ticker_date ON financial_health_snapshots(ticker, created_at DESC)`);

    await client.query('COMMIT');
    console.log('✅ FSI Schema Applied.');
  } catch (e: any) {
    await client.query('ROLLBACK');
    console.error('❌ Migration Failed:', e.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
