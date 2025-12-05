import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function migrate() {
  console.log('   Creating User Portfolio tables...');
  
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_portfolio_holdings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL, -- Simulating single user '1' for now
        ticker VARCHAR(10) NOT NULL,
        shares DECIMAL DEFAULT 0,
        avg_cost DECIMAL DEFAULT 0,
        purchase_date DATE DEFAULT CURRENT_DATE,
        notes TEXT,
        last_analysis JSONB, -- Stores the latest AI output
        last_analyzed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, ticker)
      );
    `);
    
    console.log('   ✅ Created user_portfolio_holdings table.');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Setup Failed:', error.message);
    process.exit(1);
  }
}

migrate();
