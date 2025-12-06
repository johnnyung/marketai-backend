import { pool } from "../db/index.js";
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();


async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Shadow Liquidity
    await client.query(`
      CREATE TABLE IF NOT EXISTS shadow_liquidity_prints (
        id SERIAL PRIMARY KEY,
        ticker VARCHAR(20),
        shadow_ratio NUMERIC,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 2. Currency Shocks
    await client.query(`
      CREATE TABLE IF NOT EXISTS currency_shocks (
        id SERIAL PRIMARY KEY,
        regime VARCHAR(50),
        shock_level VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 3. Narrative Pressure
    await client.query(`
      CREATE TABLE IF NOT EXISTS narrative_pressure_logs (
        id SERIAL PRIMARY KEY,
        ticker VARCHAR(20),
        pressure_score INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query('COMMIT');
    console.log('✅ v113 Tables Verified.');
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
