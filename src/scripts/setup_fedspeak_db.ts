import { pool } from "../db/index.js";
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();


async function migrate() {
  console.log('   Creating Fed-Speak tables...');
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS fed_policy_signals (
        id SERIAL PRIMARY KEY,
        speaker VARCHAR(100),
        hawkish_score INTEGER, -- -100 (Dovish) to +100 (Hawkish)
        key_phrase TEXT,
        implied_rate_move VARCHAR(50), -- 'HIKE', 'CUT', 'PAUSE'
        market_impact_prediction TEXT,
        analyzed_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('   ✅ Created fed_policy_signals table.');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Setup Failed:', error.message);
    process.exit(1);
  }
}
migrate();
