import { pool } from "../db/index.js";
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();


async function reset() {
  console.log('🔌 Connecting to DB...');
  try {
    // 1. Reset api_layer specifically
    await pool.query(`
        UPDATE system_status
        SET status = 'cached', message = 'Monitoring', last_updated = NOW()
        WHERE source_id = 'api_layer'
    `);
    console.log('   ✅ Reset api_layer status.');

    // 2. Reset any other stale 'scanning' widgets (>10 mins old)
    const res = await pool.query(`
        UPDATE system_status
        SET status = 'cached', message = 'Timeout Reset', last_updated = NOW()
        WHERE status = 'scanning' AND last_updated < NOW() - INTERVAL '10 minutes'
        RETURNING source_id
    `);
    
    if (res.rowCount > 0) {
        console.log(`   ✅ Auto-reset ${res.rowCount} stuck widgets: ${res.rows.map(r => r.source_id).join(', ')}`);
    } else {
        console.log('   ✅ No other stuck widgets found.');
    }

  } catch (e) {
    console.error('❌ DB Error:', e);
  } finally {
    await pool.end();
  }
}

reset();
