import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function migrate() {
  console.log('🔄 Adding Allocation columns...');
  try {
    await pool.query(`
      ALTER TABLE ai_stock_tips
      ADD COLUMN IF NOT EXISTS allocation_pct DECIMAL,
      ADD COLUMN IF NOT EXISTS kelly_score DECIMAL;
    `);
    console.log('✅ Schema Updated: allocation_pct added.');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally { await pool.end(); }
}

migrate();
