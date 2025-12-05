import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function purge() {
  console.log('🗑️  Scanning for ancient history...');
  try {
    // Delete anything with a date before 1970 OR any event description that sounds ancient
    const res = await pool.query(`
        DELETE FROM historical_events
        WHERE event_date < '1970-01-01'
        OR description ILIKE '%18%'
        OR description ILIKE '%19th century%'
        OR event ILIKE '%18%'
    `);
    console.log(`✅ Purged ${res.rowCount} irrelevant historical records.`);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

purge();
