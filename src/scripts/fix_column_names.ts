import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function repair() {
  console.log('🏦 Standardizing Stock Positions Schema...');
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Check if conflicting columns exist
    console.log('   🔍 Checking column state...');
    
    const res = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'stock_positions'
      AND column_name IN ('avg_buy_price', 'avg_entry_price')
    `);
    
    const columns = res.rows.map(r => r.column_name);
    console.log('      Found columns:', columns.join(', '));

    // 2. Ensure target column 'avg_entry_price' exists
    if (!columns.includes('avg_entry_price')) {
        console.log('   ➕ Creating avg_entry_price column...');
        await client.query(`
            ALTER TABLE stock_positions
            ADD COLUMN avg_entry_price DECIMAL DEFAULT 0
        `);
    }

    // 3. Migrate data if 'avg_buy_price' exists
    if (columns.includes('avg_buy_price')) {
        console.log('   🔄 Migrating data from avg_buy_price -> avg_entry_price...');
        await client.query(`
            UPDATE stock_positions
            SET avg_entry_price = avg_buy_price
            WHERE avg_entry_price IS NULL OR avg_entry_price = 0
        `);
        
        console.log('   🗑️  Dropping legacy column avg_buy_price...');
        await client.query(`
            ALTER TABLE stock_positions
            DROP COLUMN avg_buy_price
        `);
    } else {
        console.log('   ✅ No legacy avg_buy_price column found.');
    }

    // 4. Ensure Not Null constraint on new column (safely)
    console.log('   🔒 Securing schema constraints...');
    await client.query(`
        UPDATE stock_positions SET avg_entry_price = 0 WHERE avg_entry_price IS NULL;
        ALTER TABLE stock_positions ALTER COLUMN avg_entry_price SET DEFAULT 0;
        ALTER TABLE stock_positions ALTER COLUMN avg_entry_price SET NOT NULL;
    `);

    await client.query('COMMIT');
    console.log('✅ Schema Standardization Complete.');

  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('❌ Repair Failed:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

repair();
