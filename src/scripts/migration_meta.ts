import { pool } from "../db/index.js";
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();


async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS meta_diagnostics_logs (
        id SERIAL PRIMARY KEY,
        run_date TIMESTAMP DEFAULT NOW(),
        
        health_score INTEGER, -- 0 to 100
        blind_spots JSONB,    -- Missing data sources
        weak_signals JSONB,   -- Low confidence agents
        agent_conflicts JSONB, -- Where agents disagreed
        drift_metrics JSONB,  -- Confidence drift stats
        
        recommendations TEXT[] -- "Fix FMP Key", "Recalibrate Momentum"
      );
    `);
    
    await client.query(`CREATE INDEX IF NOT EXISTS idx_meta_date ON meta_diagnostics_logs(run_date DESC)`);

    await client.query('COMMIT');
    console.log('✅ Meta-Cortex Schema Applied.');
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
