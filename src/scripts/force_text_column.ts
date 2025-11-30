import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function migrate() {
  console.log('🔄 Forcing pattern_matches table update...');
  try {
    // 1. Drop the constraint/type entirely and recreate column as TEXT
    // This uses the "USING" clause to convert any existing numbers to strings so data isn't lost
    await pool.query(`
      ALTER TABLE pattern_matches 
      ALTER COLUMN predicted_impact TYPE TEXT 
      USING predicted_impact::text;
    `);
    
    console.log('✅ Column predicted_impact is now TEXT.');
    
    // 2. Also ensure other fields are flexible
    await pool.query(`
      ALTER TABLE pattern_matches 
      ALTER COLUMN reasoning TYPE TEXT;
    `);

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

migrate();
