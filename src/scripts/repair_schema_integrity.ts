import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function repair() {
  console.log('🔌 Connecting to Database...');
  
  const tables = ['correlation_patterns', 'historical_events', 'raw_data_collection'];

  try {
    for (const table of tables) {
        console.log(`   🔧 Checking ${table}...`);
        
        // Check if created_at exists
        const res = await pool.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = $1 AND column_name = 'created_at'
        `, [table]);

        if (res.rows.length === 0) {
            console.log(`      -> Adding missing column: created_at`);
            await pool.query(`ALTER TABLE ${table} ADD COLUMN created_at TIMESTAMP DEFAULT NOW()`);
        } else {
            console.log(`      -> Column exists.`);
        }
    }
    console.log('✅ Schema Repair Complete.');
  } catch (e: any) {
    console.error('❌ Repair Failed:', e.message);
  } finally {
    await pool.end();
  }
}

repair();
