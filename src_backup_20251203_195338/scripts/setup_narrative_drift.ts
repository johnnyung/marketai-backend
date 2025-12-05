import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function migrate() {
  console.log('   Creating Narrative History tables...');
  
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS narrative_snapshots (
        id SERIAL PRIMARY KEY,
        snapshot_date DATE UNIQUE,
        dominant_theme VARCHAR(255),
        full_summary TEXT,
        top_keywords TEXT[],
        sentiment_score DECIMAL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Seed a "Last Week" entry so the diff engine works immediately
    await pool.query(`
        INSERT INTO narrative_snapshots (snapshot_date, dominant_theme, full_summary, top_keywords, sentiment_score, created_at)
        VALUES (
            CURRENT_DATE - INTERVAL '7 days',
            'Inflation Anxiety & Fed Uncertainty',
            'Market focused on sticky CPI data and fears of "Higher for Longer" rates. Tech valuations under scrutiny.',
            ARRAY['inflation', 'rates', 'fed', 'uncertainty'],
            45,
            NOW() - INTERVAL '7 days'
        ) ON CONFLICT (snapshot_date) DO NOTHING;
    `);
    
    console.log('   ✅ Created narrative_snapshots table with seed data.');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Setup Failed:', error.message);
    process.exit(1);
  }
}

migrate();
