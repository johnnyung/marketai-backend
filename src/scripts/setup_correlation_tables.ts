import { pool } from "../db/index.js";
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();


async function setup() {
  console.log('🔌 Connecting to DB...');
  try {
    // 1. Historical Prices Table (Granular)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS market_correlation_history (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        asset_type VARCHAR(20), -- 'crypto' or 'stock'
        symbol VARCHAR(10),
        friday_close DECIMAL,
        sunday_close DECIMAL,   -- For Crypto
        monday_open DECIMAL,    -- For Stocks
        weekend_change_pct DECIMAL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 2. Patterns Table (The "Memory" of the AI)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS correlation_patterns (
        id SERIAL PRIMARY KEY,
        driver_asset VARCHAR(10),   -- e.g., BTC
        target_asset VARCHAR(10),   -- e.g., MSTR
        correlation_coefficient DECIMAL, -- 0.0 to 1.0
        beta_coefficient DECIMAL,        -- Volatility multiplier (e.g., 1.5x)
        win_rate DECIMAL,                -- Historical accuracy
        last_updated TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // 3. Prediction Queue (For the Dashboard)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS correlation_signals (
        id SERIAL PRIMARY KEY,
        driver_move DECIMAL,
        target_ticker VARCHAR(10),
        predicted_open DECIMAL,
        predicted_gap_pct DECIMAL,
        confidence_score DECIMAL,
        reasoning TEXT,
        status VARCHAR(20) DEFAULT 'active', -- active, validated, expired
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('✅ Correlation Tables Created.');
  } catch (e) {
    console.error('❌ DB Setup Failed:', e);
  } finally {
    await pool.end();
  }
}

setup();
