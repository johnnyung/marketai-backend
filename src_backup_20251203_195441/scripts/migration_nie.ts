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
      CREATE TABLE IF NOT EXISTS news_impact_ratings (
        id SERIAL PRIMARY KEY,
        url_hash VARCHAR(255) UNIQUE, -- Links to digest_entries
        
        impact_score INTEGER,         -- 0-100
        is_noise BOOLEAN DEFAULT FALSE,
        is_shock BOOLEAN DEFAULT FALSE,
        
        catalyst_type VARCHAR(50),    -- EARNINGS, REGULATION, M&A, MACRO, PRODUCT
        confidence NUMERIC,
        
        analyzed_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_nie_score ON news_impact_ratings(impact_score DESC)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_nie_shock ON news_impact_ratings(is_shock)`);

    await client.query('COMMIT');
    console.log('✅ NIE Schema Applied (news_impact_ratings).');
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
