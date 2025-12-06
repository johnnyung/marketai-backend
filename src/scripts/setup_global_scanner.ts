import { pool } from "../db/index.js";
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();


async function migrate() {
  console.log('   Creating Global Market tables...');
  
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS global_market_snapshots (
        id SERIAL PRIMARY KEY,
        snapshot_date DATE,
        regime VARCHAR(50), -- 'GLOBAL_BULL', 'GLOBAL_BEAR', 'US_EXCEPTIONALISM', 'GLOBAL_DRAG', 'MIXED'
        us_change DECIMAL,
        eu_change DECIMAL,
        asia_change DECIMAL,
        em_change DECIMAL,
        divergence_score DECIMAL, -- 0 to 100 scale of separation
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    console.log('   ✅ Created global_market_snapshots table.');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Setup Failed:', error.message);
    process.exit(1);
  }
}

migrate();
