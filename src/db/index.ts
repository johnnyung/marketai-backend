import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Railway Internal = No SSL usually needed
// Railway External = SSL Required
const isProduction = process.env.NODE_ENV === 'production';
const isExternal = process.env.DATABASE_URL?.includes('rlwy.net');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: (isExternal || (isProduction && isExternal)) ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 5000
});

pool.on('error', (err) => console.error('❌ Idle DB Error:', err));

export const query = (text: string, params?: any[]) => pool.query(text, params);
export const getClient = () => pool.connect();
export default pool;
