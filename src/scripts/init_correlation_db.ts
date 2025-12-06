import { pool } from "../db/index.js";
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();


async function migrate() {
  console.log('⚗️  Initializing Correlation Lab Database...');

  try {
    // Table 1: Stores the raw weekend gap data for analysis
    await pool.query(`
      CREATE TABLE IF NOT EXISTS market_price_gaps (
        id SERIAL PRIMARY KEY,
        symbol VARCHAR(10),
        asset_type VARCHAR(20), -- 'CRYPTO' or 'STOCK'
        date DATE, -- The Monday date
        friday_close DECIMAL,
        monday_open DECIMAL,
        weekend_gap_pct DECIMAL, -- The % move over the weekend
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(symbol, date)
      );
    `);

    // Table 2: Stores the calculated correlations (The "Brain")
    await pool.query(`
      CREATE TABLE IF NOT EXISTS asset_correlations (
        id SERIAL PRIMARY KEY,
        crypto_asset VARCHAR(10), -- e.g. BTC
        stock_ticker VARCHAR(10), -- e.g. COIN
        correlation_coefficient DECIMAL, -- -1.0 to 1.0
        sample_size INTEGER,
        last_updated TIMESTAMP DEFAULT NOW(),
        UNIQUE(crypto_asset, stock_ticker)
      );
    `);

    console.log('✅ Database tables ready.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
