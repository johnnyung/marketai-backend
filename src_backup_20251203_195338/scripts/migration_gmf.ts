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
      CREATE TABLE IF NOT EXISTS macro_forecast_snapshots (
        id SERIAL PRIMARY KEY,
        snapshot_date DATE DEFAULT CURRENT_DATE,
        
        -- Core Metrics
        inflation_trend VARCHAR(20), -- HEATING, COOLING, STABLE
        growth_trend VARCHAR(20),    -- EXPANDING, SLOWING, CONTRACTING
        liquidity_trend VARCHAR(20), -- TIGHTENING, EASING, NEUTRAL
        
        -- Raw Values
        cpi_yoy NUMERIC,
        ppi_yoy NUMERIC,
        gdp_growth NUMERIC,
        unemployment NUMERIC,
        fed_rate NUMERIC,
        yield_10y NUMERIC,
        yield_curve_spread NUMERIC, -- 10Y - 2Y
        dxy_level NUMERIC,
        
        -- Calculated Output
        macro_health_score INTEGER, -- 0-100 (0 = Depression, 100 = Goldilocks Boom)
        forecast_summary TEXT,
        
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(snapshot_date)
      );
    `);

    await client.query('COMMIT');
    console.log('✅ GMF Schema Applied (macro_forecast_snapshots).');
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
