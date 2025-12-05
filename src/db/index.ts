import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Since we are forcing the Public Proxy URL, we MUST use SSL
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000
});

pool.on('error', (err) => console.error('❌ DB Error:', err));

export const query = (text: string, params?: any[]) => pool.query(text, params);
export const getClient = () => pool.connect();
export default pool;
