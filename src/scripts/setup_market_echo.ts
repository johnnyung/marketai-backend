import { pool } from "../db/index.js";
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();


async function migrate() {
  console.log('   Creating Market Echo tables...');
  
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS active_market_echoes (
        id SERIAL PRIMARY KEY,
        historical_event_name VARCHAR(255),
        resonance_score INTEGER, -- 0 to 100
        narrative_parallel TEXT,
        affected_sectors JSONB,
        detected_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    console.log('   ✅ Created active_market_echoes table.');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Setup Failed:', error.message);
    process.exit(1);
  }
}

migrate();
