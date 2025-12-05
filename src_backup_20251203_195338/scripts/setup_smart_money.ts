import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function migrate() {
  console.log('   Creating Smart Money tables...');
  
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS smart_money_signals (
        id SERIAL PRIMARY KEY,
        ticker VARCHAR(10),
        signal_type VARCHAR(50), -- 'CLUSTER_BUY', 'BLOCK_TRADE', 'SECTOR_ROTATION'
        intensity INTEGER, -- 0-100
        details TEXT,
        source_funds JSONB, -- Array of fund names if cluster buy
        detected_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    console.log('   ✅ Created smart_money_signals table.');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Setup Failed:', error.message);
    process.exit(1);
  }
}

migrate();
