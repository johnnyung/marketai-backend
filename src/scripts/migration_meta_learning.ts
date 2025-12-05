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

    // 1. Signal Weights (The Brain's Synapses)
    await client.query(`
      CREATE TABLE IF NOT EXISTS signal_weights (
        signal_name VARCHAR(50) PRIMARY KEY,
        weight NUMERIC DEFAULT 1.0,
        confidence_interval NUMERIC DEFAULT 0.1,
        last_updated TIMESTAMP DEFAULT NOW()
      );
    `);

    // Seed default weights if empty
    const signals = ['momentum', 'value', 'catalyst', 'insider', 'gamma', 'shadow', 'narrative', 'fsi', 'regime', 'volatility'];
    for (const s of signals) {
        await client.query(`
            INSERT INTO signal_weights (signal_name, weight) VALUES ($1, 1.0)
            ON CONFLICT (signal_name) DO NOTHING
        `, [s]);
    }

    // 2. Learning Snapshots (History of Evolution)
    await client.query(`
      CREATE TABLE IF NOT EXISTS meta_learning_snapshots (
        id SERIAL PRIMARY KEY,
        run_date DATE DEFAULT CURRENT_DATE,
        
        win_rate_7d NUMERIC,
        accuracy_score NUMERIC,
        
        active_biases JSONB,     -- Current weights
        blind_spots JSONB,       -- Detected gaps
        drift_metrics JSONB,     -- Model drift
        
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query('COMMIT');
    console.log('✅ Meta-Learning Schema Applied.');
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
