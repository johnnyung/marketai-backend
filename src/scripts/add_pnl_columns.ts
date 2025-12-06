import { pool } from "../db/index.js";
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();


async function migrate() {
  console.log('🔄 Adding P&L tracking columns to ai_stock_tips...');
  
  try {
    await pool.query(`
      ALTER TABLE ai_stock_tips
      ADD COLUMN IF NOT EXISTS final_pnl DECIMAL,
      ADD COLUMN IF NOT EXISTS final_pnl_pct DECIMAL,
      ADD COLUMN IF NOT EXISTS exit_price DECIMAL,
      ADD COLUMN IF NOT EXISTS exit_date TIMESTAMP,
      ADD COLUMN IF NOT EXISTS exit_reason TEXT,
      ADD COLUMN IF NOT EXISTS current_pnl DECIMAL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS current_pnl_pct DECIMAL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS current_value DECIMAL,
      ADD COLUMN IF NOT EXISTS last_price_update TIMESTAMP;
    `);
    
    console.log('✅ Schema Updated. "final_pnl" column is ready.');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
