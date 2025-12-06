import { pool } from "../db/index.js";
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();


async function migrate() {
  console.log('   Creating Short Interest Cache...');
  
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS short_interest_cache (
        ticker VARCHAR(10) PRIMARY KEY,
        short_float_pct DECIMAL,
        days_to_cover DECIMAL,
        borrow_fee_pct DECIMAL,
        last_updated TIMESTAMP DEFAULT NOW()
      );
    `);
    
    console.log('   ✅ Created short_interest_cache table.');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Setup Failed:', error.message);
    process.exit(1);
  }
}

migrate();
