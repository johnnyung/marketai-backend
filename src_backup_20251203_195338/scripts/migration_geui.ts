import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Table to store WHAT is inside each ETF
    await client.query(`
      CREATE TABLE IF NOT EXISTS global_etf_constituents (
        id SERIAL PRIMARY KEY,
        etf_ticker VARCHAR(20) NOT NULL,    -- e.g., 'VT'
        asset_ticker VARCHAR(20) NOT NULL,  -- e.g., '7203.T' (Toyota) or 'AAPL'
        asset_name VARCHAR(255),
        weight_percent DECIMAL,
        shares_held DECIMAL,
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(etf_ticker, asset_ticker)
      );
    `);

    // 2. Index for fast lookup ("Who holds AAPL?")
    await client.query(`CREATE INDEX IF NOT EXISTS idx_geui_asset ON global_etf_constituents(asset_ticker)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_geui_etf ON global_etf_constituents(etf_ticker)`);

    await client.query('COMMIT');
    console.log('✅ GEUI Schema Applied (global_etf_constituents).');
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
