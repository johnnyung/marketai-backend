import { pool } from "../db/index.js";
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();


async function migrate() {
  console.log('🔌 Connecting to Database...');
  
  try {
    // 1. DROP with CASCADE to remove dependencies (views, foreign keys)
    console.log('   💣 Force dropping old tables...');
    await pool.query('DROP TABLE IF EXISTS correlation_patterns CASCADE');
    await pool.query('DROP TABLE IF EXISTS correlation_signals CASCADE');

    // 2. Recreate PATTERNS table (The "Memory")
    console.log('   ✨ Recreating correlation_patterns...');
    await pool.query(`
      CREATE TABLE correlation_patterns (
        id SERIAL PRIMARY KEY,
        driver_asset VARCHAR(20),
        target_asset VARCHAR(20),
        correlation_coefficient DECIMAL,
        beta_coefficient DECIMAL,     -- The column we need
        win_rate DECIMAL,
        last_updated TIMESTAMP DEFAULT NOW()
      )
    `);
    
    // 3. Recreate SIGNALS table (The "Live Feed")
    console.log('   ✨ Recreating correlation_signals...');
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
      )
    `);

    // 4. Seed Data
    console.log('   🌱 Seeding fresh data...');
    const patterns = [
      { driver: 'BTC', target: 'MSTR', corr: 0.92, beta: 1.8, win: 85.0 },
      { driver: 'BTC', target: 'COIN', corr: 0.85, beta: 1.2, win: 82.0 },
      { driver: 'BTC', target: 'MARA', corr: 0.88, beta: 2.1, win: 78.0 },
      { driver: 'BTC', target: 'RIOT', corr: 0.89, beta: 2.3, win: 75.0 },
      { driver: 'ETH', target: 'NVDA', corr: 0.45, beta: 0.4, win: 60.0 }
    ];

    for (const p of patterns) {
      await pool.query(`
        INSERT INTO correlation_patterns
        (driver_asset, target_asset, correlation_coefficient, beta_coefficient, win_rate)
        VALUES ($1, $2, $3, $4, $5)
      `, [p.driver, p.target, p.corr, p.beta, p.win]);
    }

    // 5. Seed a test signal so the dashboard isn't empty immediately
    await pool.query(`
        INSERT INTO correlation_signals 
        (target_ticker, predicted_gap_pct, confidence_score, reasoning, status)
        VALUES ('MSTR', 4.5, 88, 'Correlation Test Signal (System Reset)', 'active')
    `);

    console.log('✅ Migration Complete: Database structure is now 100% compliant.');

  } catch (error: any) {
    console.error('❌ Migration Failed:', error.message);
  } finally {
    await pool.end();
  }
}

migrate();
