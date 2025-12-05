import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // FORCE SSL: We are using the public Proxy URL which demands SSL.
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
  max: 20
});

pool.on('error', (err) => {
  console.error('❌ Idle DB Client Error:', err.message);
});

export const query = (text: string, params?: any[]) => pool.query(text, params);
export const getClient = () => pool.connect();
export default pool;
