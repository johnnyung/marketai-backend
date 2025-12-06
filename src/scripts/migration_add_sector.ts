import { pool } from "../db/index.js";
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();


async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Add sector column if missing
    await client.query(`
      ALTER TABLE ai_stock_tips
      ADD COLUMN IF NOT EXISTS sector VARCHAR(100);
    `);

    // Create index for performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_tips_sector ON ai_stock_tips(sector);
    `);

    await client.query('COMMIT');
    console.log('✅ Sector Column Added Successfully.');
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
