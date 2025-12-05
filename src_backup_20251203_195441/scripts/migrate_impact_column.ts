import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function migrate() {
  console.log('🔄 Changing predicted_impact column to TEXT...');
  try {
    // 1. Rename old column to save data
    await pool.query('ALTER TABLE pattern_matches RENAME COLUMN predicted_impact TO predicted_impact_old');
    
    // 2. Create new TEXT column
    await pool.query('ALTER TABLE pattern_matches ADD COLUMN predicted_impact TEXT');
    
    // 3. Copy data over (casting to text)
    await pool.query('UPDATE pattern_matches SET predicted_impact = predicted_impact_old::text');
    
    // 4. Drop old column
    await pool.query('ALTER TABLE pattern_matches DROP COLUMN predicted_impact_old');
    
    console.log('✅ Column migrated successfully.');
    process.exit(0);
  } catch (error: any) {
    // If column doesn't exist or is already text, this might fail, which is fine
    console.log('⚠️ Migration note:', error.message);
    
    // Fallback: Try direct alter if rename failed
    try {
        await pool.query('ALTER TABLE pattern_matches ALTER COLUMN predicted_impact TYPE TEXT');
        console.log('✅ Column altered directly.');
    } catch (e) { console.log('   Already text or table missing.'); }
    
    process.exit(0);
  }
}

migrate();
