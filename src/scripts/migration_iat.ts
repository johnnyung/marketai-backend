import { pool } from "../db/index.js";
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();


async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Store track records for individual insiders (e.g., "Tim Cook")
    await client.query(`
      CREATE TABLE IF NOT EXISTS insider_track_records (
        id SERIAL PRIMARY KEY,
        insider_name VARCHAR(255) NOT NULL,
        company_ticker VARCHAR(20) NOT NULL,
        total_trades INTEGER DEFAULT 0,
        wins INTEGER DEFAULT 0,
        avg_return_3m DECIMAL DEFAULT 0.0,
        accuracy_score DECIMAL DEFAULT 50.0,
        last_updated TIMESTAMP DEFAULT NOW(),
        UNIQUE(insider_name, company_ticker)
      );
    `);

    await client.query('COMMIT');
    console.log('✅ IAT Schema Applied (insider_track_records).');
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
