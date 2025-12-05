import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;
const isInternal = connectionString?.includes('railway.internal');

console.log("🔌 DB Init:");
console.log(`   Host Type: ${isInternal ? 'INTERNAL (Cloud)' : 'EXTERNAL (Proxy)'}`);
console.log(`   SSL Mode:  ${isInternal ? 'DISABLED' : 'ENABLED (no-verify)'}`);

const pool = new Pool({
  connectionString: connectionString,
  // CRITICAL FIX: 
  // If Internal (railway.internal) -> SSL must be FALSE or undefined.
  // If External (rlwy.net) -> SSL must be { rejectUnauthorized: false }.
  ssl: isInternal ? false : { rejectUnauthorized: false },
  connectionTimeoutMillis: 5000,
  max: 20
});

pool.on('error', (err) => {
  console.error('❌ Idle DB Client Error:', err.message);
});

export const query = (text: string, params?: any[]) => pool.query(text, params);
export const getClient = () => pool.connect();
export default pool;
