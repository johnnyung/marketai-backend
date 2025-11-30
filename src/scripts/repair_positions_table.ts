import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function repair() {
  console.log('🏦 Repairing Stock Positions Table...');
  
  try {
    // 1. Add potentially missing columns
    await pool.query(`
      ALTER TABLE stock_positions
      ADD COLUMN IF NOT EXISTS market_value DECIMAL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS cost_basis DECIMAL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS unrealized_pnl DECIMAL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS current_price DECIMAL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS avg_entry_price DECIMAL DEFAULT 0;
    `);
    console.log('   ✅ Added missing columns (market_value, cost_basis, etc.)');

    // 2. Initialize values for existing rows to prevent math errors
    await pool.query(`
      UPDATE stock_positions
      SET
        market_value = shares * current_price,
        cost_basis = shares * avg_entry_price,
        unrealized_pnl = (shares * current_price) - (shares * avg_entry_price)
      WHERE market_value IS NULL OR market_value = 0;
    `);
    console.log('   ✅ Backfilled calculation data for existing positions');

  } catch (error: any) {
    console.error('❌ Repair Failed:', error.message);
  } finally {
    await pool.end();
  }
}

repair();
