import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function fixDatabase() {
  console.log('🔧 Starting Database Schema Repair...');
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // 1. FIX PATTERN_MATCHES TABLE (The cause of your current crash)
    console.log('   Processing table: pattern_matches...');
    
    // Check if column exists and what type it is
    const checkRes = await client.query(`
      SELECT data_type
      FROM information_schema.columns
      WHERE table_name = 'pattern_matches' AND column_name = 'predicted_impact'
    `);

    if (checkRes.rows.length > 0) {
      const type = checkRes.rows[0].data_type;
      console.log(`   Current type: ${type}`);
      
      if (type !== 'text' && type !== 'character varying') {
        console.log('   ⚠️ Column type mismatch. fixing...');
        // Rename old column to preserve data (just in case)
        await client.query('ALTER TABLE pattern_matches RENAME COLUMN predicted_impact TO predicted_impact_legacy_num');
        // Create new TEXT column
        await client.query('ALTER TABLE pattern_matches ADD COLUMN predicted_impact TEXT');
        // Copy data over (cast to text)
        await client.query('UPDATE pattern_matches SET predicted_impact = predicted_impact_legacy_num::text');
        console.log('   ✅ Column rebuilt as TEXT.');
      } else {
        console.log('   ✅ Column is already TEXT. No action needed.');
      }
    } else {
      // Column doesn't exist, create it
      await client.query('ALTER TABLE pattern_matches ADD COLUMN predicted_impact TEXT');
      console.log('   ✅ Created missing column predicted_impact');
    }

    // 2. ENSURE OTHER COLUMNS ARE TEXT
    await client.query('ALTER TABLE pattern_matches ALTER COLUMN reasoning TYPE TEXT');
    await client.query('ALTER TABLE pattern_matches ALTER COLUMN current_event TYPE TEXT');
    await client.query('ALTER TABLE pattern_matches ALTER COLUMN historical_match TYPE TEXT');

    await client.query('COMMIT');
    console.log('🚀 Database Schema Fixed Successfully.');
    process.exit(0);

  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('❌ Migration Failed:', error.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

fixDatabase();
