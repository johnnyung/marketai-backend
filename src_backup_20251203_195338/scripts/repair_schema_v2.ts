import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function repair() {
  console.log('🔌 Connecting to Database for Repair...');
  
  const tablesToCheck = [
    'correlation_patterns',
    'historical_events',
    'raw_data_collection',
    'ai_stock_tips',
    'digest_entries'
  ];

  try {
    for (const table of tablesToCheck) {
        // Check if table exists
        const exists = await pool.query(`
            SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)
        `, [table]);

        if (exists.rows[0].exists) {
            // Check for created_at
            const colCheck = await pool.query(`
                SELECT column_name FROM information_schema.columns
                WHERE table_name = $1 AND column_name = 'created_at'
            `, [table]);

            if (colCheck.rows.length === 0) {
                console.log(`   🛠️  Adding 'created_at' to ${table}...`);
                await pool.query(`ALTER TABLE ${table} ADD COLUMN created_at TIMESTAMP DEFAULT NOW()`);
            } else {
                console.log(`   ✅ ${table} has valid schema.`);
            }
        }
    }
    console.log('✅ Database Schema Repair Complete.');
  } catch (e: any) {
    console.error('❌ Repair Failed:', e.message);
  } finally {
    await pool.end();
  }
}

repair();
