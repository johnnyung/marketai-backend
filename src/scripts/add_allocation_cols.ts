import { pool } from "../db/index.js";
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();


async function migrate() {
  console.log('🔄 Adding Allocation columns...');
  try {
    await pool.query(`
      ALTER TABLE ai_stock_tips
      ADD COLUMN IF NOT EXISTS allocation_pct DECIMAL,
      ADD COLUMN IF NOT EXISTS kelly_score DECIMAL;
    `);
    console.log('✅ Schema Updated: allocation_pct added.');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally { await pool.end(); }
}

migrate();
