import { pool } from "../db/index.js";
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();


async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create Corporate Actions Log
    await client.query(`
      CREATE TABLE IF NOT EXISTS corporate_actions_log (
        id SERIAL PRIMARY KEY,
        ticker VARCHAR(20),
        event_type VARCHAR(50), -- 'DIVIDEND', 'SPLIT', 'BUYBACK', 'GUIDANCE', 'TRANSCRIPT'
        event_date DATE,
        description TEXT,
        impact_score INTEGER, -- -100 to 100
        details JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(ticker, event_type, event_date)
      );
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_cae_ticker ON corporate_actions_log(ticker)`);

    await client.query('COMMIT');
    console.log('✅ CAE Schema Applied (corporate_actions_log).');
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
