import { pool } from "../db/index.js";
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();


async function migrate() {
  console.log('⚖️  Setting up Confidence Ledger...');
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS confidence_ledger (
        id SERIAL PRIMARY KEY,
        ticker VARCHAR(10),
        sector VARCHAR(50),
        initial_confidence INTEGER,
        adjusted_confidence INTEGER,
        outcome_pnl_pct DECIMAL DEFAULT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS confidence_calibration (
        sector VARCHAR(50),
        confidence_bucket VARCHAR(20), -- 'HIGH' (>85), 'MED' (70-85), 'LOW' (<70)
        actual_win_rate DECIMAL,
        adjustment_factor DECIMAL DEFAULT 1.0,
        last_updated TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (sector, confidence_bucket)
      );
    `);
    
    // Seed initial neutral calibration
    const sectors = ['Technology', 'Energy', 'Financial Services', 'Healthcare', 'General'];
    const buckets = ['HIGH', 'MED', 'LOW'];
    
    for (const s of sectors) {
        for (const b of buckets) {
            await pool.query(`
                INSERT INTO confidence_calibration (sector, confidence_bucket, actual_win_rate, adjustment_factor)
                VALUES ($1, $2, 0, 1.0)
                ON CONFLICT DO NOTHING
            `, [s, b]);
        }
    }

    console.log('   ✅ Created confidence ledger tables.');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Setup Failed:', error.message);
    process.exit(1);
  }
}

migrate();
