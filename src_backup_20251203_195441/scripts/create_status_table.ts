import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function migrate() {
  console.log('Creating system_status table...');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS system_status (
        source_id VARCHAR(50) PRIMARY KEY,
        status VARCHAR(20), -- 'scanning', 'success', 'error'
        message TEXT,
        count INTEGER DEFAULT 0,
        last_updated TIMESTAMP DEFAULT NOW()
    );
  `);
  console.log('✅ Table ready.');
  process.exit(0);
}

migrate();
