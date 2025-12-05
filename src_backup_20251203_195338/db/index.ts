import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000
});

// 1. Silence Logs: Only log errors, removed the 'connect' success log
pool.on('error', (err) => {
  console.error('❌ Database error:', err.message);
});

// 2. Core Query Function
export const query = async (text: string, params?: any[]) => {
  return pool.query(text, params);
};

// 3. Get Client
export const getClient = async () => {
  return pool.connect();
};

// 4. Transaction Wrapper (Restored)
export const transaction = async (callback: (client: any) => Promise<any>) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// 5. DB Object Wrapper (Restored for compatibility)
export const db = {
  query,
  getClient,
  transaction
};

export default pool;
