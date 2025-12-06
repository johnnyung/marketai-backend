import { pool } from "../db/index.js";
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();


async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS seasonal_learning_snapshots (
        id SERIAL PRIMARY KEY,
        month_key VARCHAR(10),     -- 'JAN', 'FEB', ...
        fomc_week BOOLEAN DEFAULT FALSE,
        earnings_season BOOLEAN DEFAULT FALSE,
        
        avg_win_rate NUMERIC,
        avg_return NUMERIC,
        volatility_factor NUMERIC,
        
        seasonal_confidence_modifier NUMERIC DEFAULT 1.0,
        
        sample_size INTEGER,
        last_updated TIMESTAMP DEFAULT NOW(),
        
        UNIQUE(month_key, fomc_week, earnings_season)
      );
    `);

    // Seed Standard Seasonality (Sell in May, Santa Rally, etc.)
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    for (const m of months) {
        let mod = 1.0;
        if (m === 'SEP') mod = 0.9; // Historically weak
        if (m === 'NOV' || m === 'DEC') mod = 1.1; // End of year rally
        if (m === 'JAN') mod = 1.05; // January effect

        await client.query(`
            INSERT INTO seasonal_learning_snapshots
            (month_key, seasonal_confidence_modifier, sample_size)
            VALUES ($1, $2, 10)
            ON CONFLICT DO NOTHING
        `, [m, mod]);
    }

    await client.query('COMMIT');
    console.log('✅ SMCW Schema Applied (seasonal_learning_snapshots).');
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
