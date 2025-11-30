import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function migrate() {
  console.log('🔄 Adding Anomaly Scoring columns...');
  try {
    await pool.query(`
      ALTER TABLE digest_entries
      ADD COLUMN IF NOT EXISTS anomaly_score INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS anomaly_type VARCHAR(50) DEFAULT 'standard';
    `);
    console.log('✅ Schema Updated: anomaly_score added.');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally { await pool.end(); }
}

migrate();
