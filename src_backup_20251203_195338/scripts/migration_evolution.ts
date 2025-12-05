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
      CREATE TABLE IF NOT EXISTS system_evolution_plans (
        id SERIAL PRIMARY KEY,
        generated_at TIMESTAMP DEFAULT NOW(),
        
        current_health_score INTEGER,
        
        -- The Roadmap
        upgrades JSONB, -- Array of Upgrade Tasks
        
        status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, IN_PROGRESS, COMPLETED
        implemented_at TIMESTAMP
      );
    `);

    await client.query('COMMIT');
    console.log('✅ Evolution Schema Applied.');
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
