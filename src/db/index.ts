import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Get the connection string
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("❌ CRITICAL: DATABASE_URL is missing!");
}

// Logic: Only use SSL if we are connecting via the Public Proxy (.net)
// Internal Railway connections (.internal) do not use SSL.
const useSSL = connectionString?.includes('rlwy.net');

console.log(`🔌 DB Config: ${useSSL ? 'SSL Mode (Public)' : 'Plain Mode (Internal)'}`);

const pool = new Pool({
  connectionString,
  ssl: useSSL ? { rejectUnauthorized: false } : false,
  connectionTimeoutMillis: 5000, // Fail fast
  max: 20
});

pool.on('error', (err) => {
  console.error('❌ Idle DB Client Error:', err.message);
});

export const query = (text: string, params?: any[]) => pool.query(text, params);
export const getClient = () => pool.connect();
export default pool;
