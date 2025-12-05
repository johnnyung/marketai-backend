import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Railway Internal (Cloud) = No SSL
// Local/External = SSL
const isInternal = process.env.DATABASE_URL?.includes('railway.internal');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isInternal ? false : { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000
});

pool.on('error', (err) => console.error('❌ DB Pool Error:', err));

export const query = (text: string, params?: any[]) => pool.query(text, params);
export const getClient = () => pool.connect();
export default pool;
