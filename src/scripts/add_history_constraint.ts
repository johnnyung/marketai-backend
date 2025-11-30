import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function migrate() {
  console.log('🔧 Fixing historical_events table constraints...');
  
  try {
    // 1. Remove duplicate events (keeping the one with the lowest ID/oldest)
    // This is necessary before we can apply a UNIQUE constraint
    console.log('   1. Removing existing duplicates...');
    await pool.query(`
      DELETE FROM historical_events a USING (
        SELECT MIN(ctid) as ctid, event
        FROM historical_events
        GROUP BY event HAVING COUNT(*) > 1
      ) b
      WHERE a.event = b.event
      AND a.ctid <> b.ctid
    `);

    // 2. Add Unique Constraint if it doesn't exist
    console.log('   2. Adding UNIQUE constraint to "event" column...');
    try {
        await pool.query(`
          ALTER TABLE historical_events 
          ADD CONSTRAINT historical_events_event_key UNIQUE (event);
        `);
        console.log('      ✅ Constraint added.');
    } catch (e: any) {
        if (e.code === '42710') { // Duplicate object/constraint exists
            console.log('      ✅ Constraint already exists.');
        } else {
            throw e;
        }
    }

    console.log('🚀 Database Repair Complete.');
    process.exit(0);

  } catch (error: any) {
    console.error('❌ Migration Failed:', error.message);
    process.exit(1);
  }
}

migrate();
