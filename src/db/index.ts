import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const rawUrl = process.env.DATABASE_URL || '';
const isInternal = rawUrl.includes('railway.internal');

// DEBUG LOGGING (Masked)
const maskedUrl = rawUrl.replace(/:[^:]*@/, ':***@');
console.log(`🔌 DB Attempting Connection to: ${maskedUrl}`);
console.log(`   Environment: ${process.env.NODE_ENV}`);
console.log(`   Network Config: ${isInternal ? 'INTERNAL' : 'EXTERNAL'}`);

const pool = new Pool({
  connectionString: rawUrl,
  // UNIVERSAL SSL FIX: 
  // Enable SSL but trust the self-signed cert. 
  // This works for both the Public Proxy AND the Internal Network if SSL is enabled there.
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000, // 10 seconds
  max: 10
});

pool.on('error', (err) => {
  console.error('❌ Idle Client Error:', err.message);
});

export const query = (text: string, params?: any[]) => pool.query(text, params);
export const getClient = () => pool.connect();
export default pool;
