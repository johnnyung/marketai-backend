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
      CREATE TABLE IF NOT EXISTS institutional_flow_metrics (
        id SERIAL PRIMARY KEY,
        ticker VARCHAR(20),
        
        -- 13F Data
        institutional_ownership_pct NUMERIC,
        number_of_funds INTEGER,
        top_holders JSONB,
        
        -- Flow Data
        etf_inflow_vol NUMERIC,
        dark_pool_sentiment VARCHAR(20),
        
        -- Computed Score
        institutional_conviction_score INTEGER, -- 0-100
        
        period_date DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT NOW(),
        
        UNIQUE(ticker, period_date)
      );
    `);

    await client.query('COMMIT');
    console.log('✅ IFE Schema Applied (institutional_flow_metrics).');
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
