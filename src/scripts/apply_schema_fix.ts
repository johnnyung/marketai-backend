import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS gamma_snapshots (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMP DEFAULT NOW(),
      ticker VARCHAR(20),
      net_gamma NUMERIC,
      regime VARCHAR(50)
  );`,
  
  `CREATE TABLE IF NOT EXISTS narrative_pressure_logs (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMP DEFAULT NOW(),
      ticker VARCHAR(20),
      pressure_score INTEGER
  );`,
  
  `CREATE TABLE IF NOT EXISTS insider_intent_logs (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMP DEFAULT NOW(),
      ticker VARCHAR(20),
      classification VARCHAR(50)
  );`,
  
  `CREATE TABLE IF NOT EXISTS currency_shocks (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMP DEFAULT NOW(),
      regime VARCHAR(50),
      shock_level VARCHAR(50)
  );`,
  
  `CREATE TABLE IF NOT EXISTS divergence_signals (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMP DEFAULT NOW(),
      ticker VARCHAR(20),
      divergence_type VARCHAR(50)
  );`,
  
  `CREATE TABLE IF NOT EXISTS regime_snapshots (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMP DEFAULT NOW(),
      current_regime VARCHAR(50),
      probability NUMERIC
  );`,
  
  `CREATE TABLE IF NOT EXISTS shadow_liquidity_prints (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMP DEFAULT NOW(),
      ticker VARCHAR(20),
      shadow_ratio NUMERIC
  );`
];

async function runMigrations() {
  const client = await pool.connect();
  try {
    console.log("   🚀 Applying Migrations...");
    await client.query('BEGIN');
    
    for (const sql of MIGRATIONS) {
        await client.query(sql);
        console.log(`      ✓ Executed: ${sql.substring(0, 40)}...`);
    }
    
    await client.query('COMMIT');
    console.log("   ✅ All Tables Created Successfully.");
  } catch (e: any) {
    await client.query('ROLLBACK');
    console.error("   ❌ Migration Failed:", e.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();
