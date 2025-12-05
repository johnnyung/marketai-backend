import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function migrate() {
  console.log('🔄 Migrating ai_stock_tips table...');
  try {
    // Ensure columns exist for the deep analysis data
    await pool.query(`
      ALTER TABLE ai_stock_tips
      ADD COLUMN IF NOT EXISTS tier VARCHAR(50),
      ADD COLUMN IF NOT EXISTS company_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS risk_score INTEGER,
      ADD COLUMN IF NOT EXISTS timeframe VARCHAR(50),
      ADD COLUMN IF NOT EXISTS catalysts JSONB,
      ADD COLUMN IF NOT EXISTS exit_strategy TEXT,
      ADD COLUMN IF NOT EXISTS expected_gain_percent DECIMAL;
    `);
    console.log('✅ Table schema updated.');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

migrate();
