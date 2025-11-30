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

    await client.query(`
      CREATE TABLE IF NOT EXISTS agent_reliability_snapshots (
        id SERIAL PRIMARY KEY,
        snapshot_date DATE DEFAULT CURRENT_DATE,
        
        -- Agent Performance Metrics
        agent_name VARCHAR(50) NOT NULL,
        win_rate NUMERIC,
        avg_pnl_contribution NUMERIC,
        consistency_score NUMERIC,
        volatility_sensitivity NUMERIC,
        
        -- Weighting Output
        reliability_multiplier NUMERIC DEFAULT 1.0,
        
        -- Context
        sample_size INTEGER,
        regime_context VARCHAR(50),
        
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_snapshot ON agent_reliability_snapshots(agent_name, snapshot_date)`);

    await client.query('COMMIT');
    console.log('✅ POT Phase 3 Schema Applied (agent_reliability_snapshots).');
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
