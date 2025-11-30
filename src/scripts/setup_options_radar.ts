import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function migrate() {
  console.log('   Creating Options Radar tables...');
  
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS options_alerts (
        id SERIAL PRIMARY KEY,
        ticker VARCHAR(10),
        alert_type VARCHAR(50), -- 'CALL_SWEEP', 'PUT_SWEEP', 'GAMMA_SQUEEZE'
        strike_price DECIMAL,
        expiration_date DATE,
        premium DECIMAL,
        sentiment VARCHAR(20), -- 'BULLISH', 'BEARISH'
        description TEXT,
        detected_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Create index for fast lookups
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_options_ticker ON options_alerts(ticker);`);
    
    console.log('   ✅ Created options_alerts table.');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Setup Failed:', error.message);
    process.exit(1);
  }
}

migrate();
