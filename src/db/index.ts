import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

console.log("🔌 DB Config: Internal Network Mode");
// IMPORTANT: Log the host to confirm we are using .internal
// We hide the password for security
if (connectionString) {
  const parts = connectionString.split('@');
  if (parts.length > 1) {
    console.log(`   Target: ${parts[1]}`);
  }
}

const pool = new Pool({
  connectionString,
  // Internal Railway connections MUST NOT use SSL
  ssl: false,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: 20
});

pool.on('error', (err) => {
  // Suppress fatal crashes on idle client errors
  console.error('❌ Idle Client Error:', err.message);
});

export const query = (text: string, params?: any[]) => pool.query(text, params);
export const getClient = () => pool.connect();
export default pool;
