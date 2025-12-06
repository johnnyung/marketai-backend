import { pool } from "../db/index.js";
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();


async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS analyst_consensus_logs (
        id SERIAL PRIMARY KEY,
        ticker VARCHAR(20),
        street_score NUMERIC,
        consensus_rating VARCHAR(50),
        validation_status VARCHAR(50), -- 'CONFIRMED', 'DIVERGENT', 'UNSUPPORTED'
        ai_correlation_details JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query('COMMIT');
    console.log('✅ ACE Schema Applied (analyst_consensus_logs).');
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
