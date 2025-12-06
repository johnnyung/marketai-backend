import { pool } from "../db/index.js";
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();


async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS volatility_learning_snapshots (
        id SERIAL PRIMARY KEY,
        snapshot_date DATE DEFAULT CURRENT_DATE,
        
        regime VARCHAR(50), -- 'LOW', 'NORMAL', 'HIGH', 'EXTREME'
        vix_level NUMERIC,
        atr_percentile NUMERIC,
        
        win_rate_in_regime NUMERIC,
        avg_drawdown_in_regime NUMERIC,
        
        confidence_modifier NUMERIC DEFAULT 1.0,
        stop_width_modifier NUMERIC DEFAULT 1.0,
        
        sample_size INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_vsa_regime ON volatility_learning_snapshots(regime, snapshot_date)`);

    // Seed Default Regimes
    await client.query(`
      INSERT INTO volatility_learning_snapshots (regime, vix_level, win_rate_in_regime, confidence_modifier, stop_width_modifier, sample_size)
      VALUES
        ('LOW', 12, 65.0, 1.0, 0.8, 10),      -- Tight stops, normal confidence
        ('NORMAL', 18, 60.0, 1.0, 1.0, 10),    -- Baseline
        ('HIGH', 25, 45.0, 0.8, 1.3, 10),      -- Lower confidence, wider stops
        ('EXTREME', 35, 30.0, 0.5, 1.5, 10)    -- Half confidence, huge stops
      ON CONFLICT (regime, snapshot_date) DO NOTHING;
    `);

    await client.query('COMMIT');
    console.log('✅ VSA Schema Applied (volatility_learning_snapshots).');
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
