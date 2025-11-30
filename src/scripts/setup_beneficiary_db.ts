import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function migrate() {
  console.log('   Creating Beneficiary Graph tables...');
  
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS beneficiary_graphs (
        id SERIAL PRIMARY KEY,
        root_event TEXT,
        order_level INTEGER, -- 1 (Direct), 2 (Secondary), 3 (Tertiary)
        sector_path VARCHAR(255), -- e.g. "Energy -> Transport -> Rail"
        beneficiary_ticker VARCHAR(10),
        logic_chain TEXT,
        confidence_score INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    console.log('   ✅ Created beneficiary_graphs table.');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Setup Failed:', error.message);
    process.exit(1);
  }
}

migrate();
