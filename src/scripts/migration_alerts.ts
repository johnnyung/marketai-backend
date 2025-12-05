import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS system_alerts (
        id SERIAL PRIMARY KEY,
        created_at TIMESTAMP DEFAULT NOW(),
        
        alert_type VARCHAR(50), -- 'CONFIDENCE_DROP', 'PERFORMANCE_DIP', 'DATA_OUTAGE', 'VOLATILITY_SPIKE'
        severity VARCHAR(20),   -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
        
        message TEXT,
        details JSONB,          -- { z_score: -2.1, current: 45, avg: 60 }
        
        is_read BOOLEAN DEFAULT FALSE,
        resolved_at TIMESTAMP
      );
    `);
    
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sys_alerts_date ON system_alerts(created_at DESC)`);

    await client.query('COMMIT');
    console.log('✅ Alert Schema Applied (system_alerts).');
  } catch (e: any) {
    await client.query('ROLLBACK');
    console.error('❌ Migration Failed:', e.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
