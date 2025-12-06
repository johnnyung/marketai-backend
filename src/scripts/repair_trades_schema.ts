import { pool } from "../db/index.js";
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();


async function repair() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check columns
    const res = await client.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'trades'
    `);
    const cols = res.rows.map(r => r.column_name);
    console.log('   Current Columns:', cols.join(', '));

    // 1. Ensure ticker exists
    if (!cols.includes('ticker')) {
        console.log('   ➕ Adding missing column: ticker');
        await client.query('ALTER TABLE trades ADD COLUMN ticker VARCHAR(10)');
    }
    
    // 2. Ensure other critical cols
    if (!cols.includes('action')) await client.query('ALTER TABLE trades ADD COLUMN action VARCHAR(10)');
    if (!cols.includes('price')) await client.query('ALTER TABLE trades ADD COLUMN price DECIMAL');
    if (!cols.includes('shares')) await client.query('ALTER TABLE trades ADD COLUMN shares DECIMAL');
    if (!cols.includes('total_amount')) await client.query('ALTER TABLE trades ADD COLUMN total_amount DECIMAL');
    if (!cols.includes('reason')) await client.query('ALTER TABLE trades ADD COLUMN reason TEXT');

    await client.query('COMMIT');
    console.log('✅ Trades Schema Repaired.');

  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('❌ Repair Failed:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

repair();
