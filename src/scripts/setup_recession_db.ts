import { pool } from "../db/index.js";
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();


async function migrate() {
  console.log('   Creating Recession Forecasting tables...');
  
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS recession_forecasts (
        id SERIAL PRIMARY KEY,
        forecast_date DATE,
        recession_probability INTEGER, -- 0 to 100
        yield_curve_status VARCHAR(50), -- 'INVERTED', 'NORMAL', 'FLAT'
        credit_stress_level VARCHAR(50), -- 'LOW', 'ELEVATED', 'HIGH'
        sahm_rule_triggered BOOLEAN,
        pmi_status VARCHAR(50), -- 'EXPANSION', 'CONTRACTION'
        details TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    console.log('   ✅ Created recession_forecasts table.');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Setup Failed:', error.message);
    process.exit(1);
  }
}

migrate();
