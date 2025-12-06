import { pool } from "../db/index.js";
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();


async function migrate() {
  console.log('   Creating Dark Pool tables...');
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS dark_pool_levels (
        ticker VARCHAR(10),
        price_level DECIMAL,
        volume BIGINT,
        trade_type VARCHAR(20), -- 'BUY_IMPLIED', 'SELL_IMPLIED', 'NEUTRAL'
        detected_at TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (ticker, price_level)
      );
    `);
    console.log('   ✅ Created dark_pool_levels table.');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Setup Failed:', error.message);
    process.exit(1);
  }
}

migrate();
