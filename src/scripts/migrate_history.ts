import { pool } from "../db/index.js";
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();


async function migrate() {
  console.log('🔄 Migrating historical_events table...');
  try {
    // 1. Add keywords column if missing
    await pool.query(`
      ALTER TABLE historical_events
      ADD COLUMN IF NOT EXISTS keywords TEXT[];
    `);
    console.log('   ✓ Added keywords column');

    // 2. Add recovery_pattern column if missing (just in case)
    await pool.query(`
      ALTER TABLE historical_events
      ADD COLUMN IF NOT EXISTS recovery_pattern TEXT;
    `);
    console.log('   ✓ Added recovery_pattern column');
    
    // 3. Add sectors_affected column if missing
    await pool.query(`
      ALTER TABLE historical_events
      ADD COLUMN IF NOT EXISTS affected_sectors JSONB;
    `);
    console.log('   ✓ Added affected_sectors column');

    console.log('✅ Schema update complete.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
