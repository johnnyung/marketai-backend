import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function fixDatabase() {
  console.log('🔧 Starting Cascade Repair...');
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // 1. DROP DEPENDENT VIEWS
    console.log('   1. Dropping blocking views...');
    // CASCADE will automatically drop any views that depend on this view as well
    await client.query('DROP VIEW IF EXISTS v_active_pattern_matches CASCADE');

    // 2. FIX THE COLUMN
    console.log('   2. Modifying pattern_matches table...');
    
    // Check if we need to fix it or if it's partially fixed
    const check = await client.query(`
        SELECT data_type FROM information_schema.columns 
        WHERE table_name = 'pattern_matches' AND column_name = 'predicted_impact'
    `);

    if (check.rows.length > 0 && check.rows[0].data_type !== 'text' && check.rows[0].data_type !== 'character varying') {
        // Rename old
        await client.query('ALTER TABLE pattern_matches RENAME COLUMN predicted_impact TO predicted_impact_old');
        // Add new
        await client.query('ALTER TABLE pattern_matches ADD COLUMN predicted_impact TEXT');
        // Copy data
        await client.query('UPDATE pattern_matches SET predicted_impact = predicted_impact_old::text');
        // Drop old
        await client.query('ALTER TABLE pattern_matches DROP COLUMN predicted_impact_old');
        console.log('      -> Column converted to TEXT');
    } else {
        console.log('      -> Column is already TEXT or correct.');
    }

    // 3. RECREATE THE VIEW
    console.log('   3. Recreating views...');
    await client.query(`
        CREATE OR REPLACE VIEW v_active_pattern_matches AS 
        SELECT * FROM pattern_matches 
        WHERE detected_at > NOW() - INTERVAL '24 hours' 
        ORDER BY detected_at DESC
    `);

    await client.query('COMMIT');
    console.log('🚀 Database Repair Complete.');
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
