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
      CREATE TABLE IF NOT EXISTS sector_bias_learning_snapshots (
        sector VARCHAR(100) PRIMARY KEY,
        
        win_rate NUMERIC,          -- % of winning trades in this sector
        avg_pnl NUMERIC,           -- Average return per trade
        total_profit_factor NUMERIC, -- Gross Profit / Gross Loss
        
        bias_multiplier NUMERIC DEFAULT 1.0, -- The adjustment factor
        
        sample_size INTEGER,
        last_updated TIMESTAMP DEFAULT NOW()
      );
    `);

    // Seed Initial Biases (Neutral)
    const sectors = [
      'Technology', 'Financial Services', 'Healthcare', 'Energy',
      'Consumer Cyclical', 'Consumer Defensive', 'Industrials',
      'Utilities', 'Real Estate', 'Basic Materials', 'Communication Services'
    ];

    for (const s of sectors) {
        await client.query(`
            INSERT INTO sector_bias_learning_snapshots (sector, win_rate, avg_pnl, bias_multiplier, sample_size)
            VALUES ($1, 50.0, 0.0, 1.0, 0)
            ON CONFLICT (sector) DO NOTHING
        `, [s]);
    }

    await client.query('COMMIT');
    console.log('✅ SIPE Schema Applied (sector_bias_learning_snapshots).');
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
