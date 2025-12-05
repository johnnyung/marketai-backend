import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Railway external connections require SSL with rejectUnauthorized: false
const sslConfig = {
  rejectUnauthorized: false
};

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Force SSL if we are on Railway OR if the URL looks like a Railway Proxy
  ssl: (process.env.NODE_ENV === 'production' || process.env.DATABASE_URL?.includes('rlwy.net'))
       ? sslConfig
       : false,
  connectionTimeoutMillis: 10000, // Fail fast
});

export const query = (text: string, params?: any[]) => pool.query(text, params);
export const getClient = () => pool.connect();
export default pool;
