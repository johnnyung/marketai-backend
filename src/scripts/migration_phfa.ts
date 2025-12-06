import { pool } from "../db/index.js";
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();


async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Add JSONB column for the complex trade plan data to avoid schema bloat
    await client.query(`
      ALTER TABLE ai_stock_tips
      ADD COLUMN IF NOT EXISTS phfa_data JSONB DEFAULT '{}';
    `);

    await client.query('COMMIT');
    console.log('✅ PHFA Schema Applied.');
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
