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
      CREATE TABLE IF NOT EXISTS reversal_trap_stats (
        id SERIAL PRIMARY KEY,
        ticker_symbol VARCHAR(20),
        
        -- Trap Metrics
        fakeout_rate NUMERIC,           -- % of times price dips below support then rips
        avg_wick_depth_pct NUMERIC,     -- How deep the "trap" usually goes
        recovery_velocity NUMERIC,      -- How fast it snaps back
        
        -- Context
        volatility_regime VARCHAR(20),
        
        sample_size INTEGER,
        last_updated TIMESTAMP DEFAULT NOW(),
        
        UNIQUE(ticker_symbol, volatility_regime)
      );
    `);

    // Seed known trap-heavy stocks
    await client.query(`
      INSERT INTO reversal_trap_stats (ticker_symbol, volatility_regime, fakeout_rate, avg_wick_depth_pct, sample_size)
      VALUES
        ('TSLA', 'HIGH', 65.0, 4.5, 20),      -- TSLA loves to wick stops
        ('NVDA', 'HIGH', 55.0, 3.2, 20),
        ('BTC-USD', 'EXTREME', 70.0, 6.0, 20),
        ('AMD', 'NORMAL', 40.0, 2.5, 20)
      ON CONFLICT (ticker_symbol, volatility_regime) DO NOTHING;
    `);

    await client.query('COMMIT');
    console.log('✅ RTD Schema Applied (reversal_trap_stats).');
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
