import { pool } from "../db/index.js";
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();


async function migrate() {
  console.log('   Creating Calendar Risk tables...');
  
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS global_risk_calendar (
        id SERIAL PRIMARY KEY,
        event_name VARCHAR(255),
        event_date DATE,
        event_type VARCHAR(50), -- 'FED', 'CPI', 'OPEC', 'EARNINGS', 'GEOPOL'
        impact_scope VARCHAR(50), -- 'GLOBAL', 'ENERGY', 'TECH', 'CRYPTO'
        risk_level INTEGER, -- 1-10
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Seed some dummy future events for immediate testing
    await pool.query(`
      INSERT INTO global_risk_calendar (event_name, event_date, event_type, impact_scope, risk_level)
      VALUES
        ('FOMC Rate Decision', CURRENT_DATE + INTERVAL '3 days', 'FED', 'GLOBAL', 10),
        ('OPEC+ Output Meeting', CURRENT_DATE + INTERVAL '5 days', 'OPEC', 'ENERGY', 8),
        ('CPI Inflation Data', CURRENT_DATE + INTERVAL '12 days', 'CPI', 'GLOBAL', 9)
    `);

    console.log('   ✅ Created global_risk_calendar table.');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Setup Failed:', error.message);
    process.exit(1);
  }
}

migrate();
