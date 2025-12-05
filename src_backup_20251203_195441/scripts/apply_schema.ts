import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Railway usually needs this
});

async function run() {
    try {
        const sql = fs.readFileSync(path.join(process.cwd(), 'src/db/schema_safety.sql'), 'utf-8');
        console.log('⚡ Applying Schema Safety Layer...');
        await pool.query(sql);
        console.log('✅ Schema Checked/Updated.');
    } catch (e: any) {
        console.error('❌ Schema Update Failed:', e.message);
    } finally {
        await pool.end();
    }
}
run();
