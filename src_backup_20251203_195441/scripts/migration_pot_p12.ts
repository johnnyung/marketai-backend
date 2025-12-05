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
      CREATE TABLE IF NOT EXISTS confidence_drift_snapshots (
        id SERIAL PRIMARY KEY,
        snapshot_date DATE DEFAULT CURRENT_DATE,
        
        avg_confidence_30d NUMERIC,
        avg_win_rate_30d NUMERIC,
        
        drift_bias NUMERIC, -- Positive = Overconfident, Negative = Underconfident
        correction_factor NUMERIC DEFAULT 1.0,
        
        sample_size INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(snapshot_date)
      );
    `);

    // Seed Initial State (Neutral)
    await client.query(`
      INSERT INTO confidence_drift_snapshots (avg_confidence_30d, avg_win_rate_30d, drift_bias, correction_factor, sample_size)
      VALUES (75.0, 75.0, 0.0, 1.0, 0)
      ON CONFLICT (snapshot_date) DO NOTHING;
    `);

    await client.query('COMMIT');
    console.log('✅ CDC Schema Applied (confidence_drift_snapshots).');
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
