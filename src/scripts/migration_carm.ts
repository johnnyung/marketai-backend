import { pool } from "../db/index.js";
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();


async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS cross_asset_risk_snapshots (
        id SERIAL PRIMARY KEY,
        snapshot_date DATE DEFAULT CURRENT_DATE,
        
        risk_score INTEGER, -- 0 (Calm) to 100 (Systemic Collapse)
        risk_regime VARCHAR(50), -- 'CALM', 'CAUTION', 'STRESS', 'CRITICAL'
        
        drivers JSONB, -- ['Yield Curve Inversion', 'Credit Spread Widening']
        
        metrics JSONB, -- { yield_spread: -0.4, credit_spread: 1.2, oil_vol: 25 }
        
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(snapshot_date)
      );
    `);

    await client.query('COMMIT');
    console.log('✅ CARM Schema Applied (cross_asset_risk_snapshots).');
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
