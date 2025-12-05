import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // In production (Railway), ALWAYS use SSL with rejectUnauthorized: false.
  // This works for both Internal (postgres.railway.internal) and External (rlwy.net) connections.
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 5000, // 5 seconds timeout
  max: 20 // Connection pool size
});

pool.on('error', (err) => {
  console.error('❌ Idle DB Client Error:', err.message);
});

export const query = (text: string, params?: any[]) => pool.query(text, params);
export const getClient = () => pool.connect();
export default pool;
