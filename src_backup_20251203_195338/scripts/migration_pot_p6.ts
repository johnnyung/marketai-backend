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
      CREATE TABLE IF NOT EXISTS drawdown_sensitivity_profiles (
        profile_key VARCHAR(50) PRIMARY KEY, -- e.g. 'blue_chip', 'crypto_alpha'
        
        avg_mae_pct NUMERIC,           -- Average drawdown of WINNING trades
        max_tolerable_drawdown NUMERIC, -- 95th percentile drawdown of winners
        recovery_rate NUMERIC,         -- % of trades that dipped > 5% and still won
        
        stop_loss_modifier NUMERIC DEFAULT 1.0, -- Multiplier for Stop distance
        confidence_penalty NUMERIC DEFAULT 0,   -- Points to deduct if high drawdown risk
        
        sample_size INTEGER,
        last_updated TIMESTAMP DEFAULT NOW()
      );
    `);

    // Seed default profiles to ensure day-1 functionality
    await client.query(`
      INSERT INTO drawdown_sensitivity_profiles (profile_key, avg_mae_pct, max_tolerable_drawdown, recovery_rate, stop_loss_modifier, confidence_penalty, sample_size)
      VALUES
        ('blue_chip', 2.5, 5.0, 0.85, 1.0, 0, 10),
        ('explosive_growth', 8.0, 15.0, 0.60, 1.2, 5, 10),
        ('crypto_alpha', 12.0, 20.0, 0.50, 1.5, 10, 10),
        ('insider_play', 4.0, 8.0, 0.75, 1.1, 0, 10),
        ('sector_play', 3.0, 6.0, 0.80, 1.0, 0, 10)
      ON CONFLICT (profile_key) DO NOTHING;
    `);

    await client.query('COMMIT');
    console.log('✅ DSC Schema Applied (drawdown_sensitivity_profiles).');
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
