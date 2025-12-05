import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function migrate() {
  console.log('   Creating Commodity Signal tables...');
  
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS commodity_signals (
        id SERIAL PRIMARY KEY,
        commodity VARCHAR(50), -- 'OIL', 'GOLD', 'WHEAT', 'COPPER'
        ticker VARCHAR(10),    -- ETF Proxy (USO, GLD)
        signal_type VARCHAR(50), -- 'SUPPLY_SHOCK', 'DEMAND_SURGE', 'GEOPOLITICAL_PREMIUM'
        region VARCHAR(100),
        severity VARCHAR(20), -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
        reason TEXT,
        detected_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    console.log('   ✅ Created commodity_signals table.');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Setup Failed:', error.message);
    process.exit(1);
  }
}

migrate();
