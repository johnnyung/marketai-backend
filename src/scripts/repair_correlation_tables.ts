import { pool } from "../db/index.js";
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();


async function repair() {
  console.log('🔌 Connecting to DB for Repair...');
  try {
    // DROP tables to ensure clean slate (fixes schema mismatches)
    await pool.query('DROP TABLE IF EXISTS correlation_signals');
    await pool.query('DROP TABLE IF EXISTS correlation_patterns');
    console.log('   🗑️  Old tables dropped.');

    // CREATE Patterns Table
    await pool.query(`
      CREATE TABLE correlation_patterns (
        id SERIAL PRIMARY KEY,
        driver_asset VARCHAR(20),
        target_asset VARCHAR(20),
        correlation_coefficient DECIMAL,
        beta_coefficient DECIMAL,
        win_rate DECIMAL,
        last_updated TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // CREATE Signals Table
    await pool.query(`
      CREATE TABLE correlation_signals (
        id SERIAL PRIMARY KEY,
        driver_move DECIMAL,
        target_ticker VARCHAR(20),
        predicted_open DECIMAL,
        predicted_gap_pct DECIMAL,
        confidence_score DECIMAL,
        reasoning TEXT,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // SEED Initial Data
    console.log('   🌱 Seeding fresh data...');
    const patterns = [
      { driver: 'BTC', target: 'MSTR', beta: 1.8, corr: 0.92 },
      { driver: 'BTC', target: 'COIN', beta: 1.2, corr: 0.85 },
      { driver: 'BTC', target: 'MARA', beta: 2.1, corr: 0.88 },
      { driver: 'BTC', target: 'RIOT', beta: 2.3, corr: 0.89 },
      { driver: 'ETH', target: 'NVDA', beta: 0.4, corr: 0.45 }
    ];

    for (const p of patterns) {
      await pool.query(`
        INSERT INTO correlation_patterns
        (driver_asset, target_asset, correlation_coefficient, beta_coefficient, win_rate)
        VALUES ($1, $2, $3, $4, 85.0)
      `, [p.driver, p.target, p.corr, p.beta]);
    }

    // Seed one signal so dashboard isn't empty
    await pool.query(`
        INSERT INTO correlation_signals 
        (target_ticker, predicted_gap_pct, confidence_score, reasoning, status)
        VALUES ('MSTR', 5.2, 92, 'High correlation to weekend BTC move.', 'active')
    `);

    console.log('✅ Database Repair Complete.');
  } catch (e) {
    console.error('❌ DB Repair Failed:', e);
  } finally {
    await pool.end();
  }
}

repair();
