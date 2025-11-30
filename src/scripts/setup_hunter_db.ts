import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function setup() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS hunter_findings (
        id SERIAL PRIMARY KEY,
        ticker VARCHAR(10),
        signal_type VARCHAR(50), -- 'Insider', 'Policy', 'Supply Chain'
        confidence INTEGER,
        thesis TEXT,
        catalyst_event TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Hunter Findings Table Created.');
  } catch (e) { console.error('❌ DB Setup Failed:', e); }
  finally { await pool.end(); }
}
setup();
