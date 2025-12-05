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
      CREATE TABLE IF NOT EXISTS event_analyses (
        id SERIAL PRIMARY KEY,
        url TEXT,
        user_notes TEXT,
        article_title TEXT,
        article_summary TEXT,
        ai_validation TEXT,     -- Did the AI agree with your notes?
        found_correlations JSONB, -- Historical matches found in DB
        trading_opportunities JSONB, -- The 10x picks
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Event Analysis Table Created.');
  } catch (e) {
    console.error('❌ DB Setup Failed:', e);
  } finally {
    await pool.end();
  }
}
setup();
