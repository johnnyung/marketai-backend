import { pool } from "../db/index.js";
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();


async function migrate() {
  console.log('   Creating Earnings Pattern tables...');
  
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS earnings_pattern_memory (
        ticker VARCHAR(10) PRIMARY KEY,
        pattern_type VARCHAR(50), -- 'RUN_UP', 'DUMP', 'VOLATILITY_CRUSH', 'INSIDER_ACCUMULATION'
        win_rate DECIMAL,         -- % of times this pattern held true in last 8 quarters
        avg_move_pct DECIMAL,     -- Average move during the pre-earnings window
        confidence_score INTEGER, -- 0-100 Reliability
        last_updated TIMESTAMP DEFAULT NOW()
      );
    `);

    // Seed with some known market truths (The "Memory")
    await pool.query(`
      INSERT INTO earnings_pattern_memory (ticker, pattern_type, win_rate, avg_move_pct, confidence_score)
      VALUES
        ('NVDA', 'RUN_UP', 87.5, 8.2, 90),
        ('AAPL', 'RUN_UP', 75.0, 3.5, 80),
        ('NFLX', 'VOLATILITY_CRUSH', 60.0, -2.0, 65),
        ('TSLA', 'DUMP', 62.5, -4.5, 70),
        ('AMD', 'RUN_UP', 70.0, 5.1, 75),
        ('MSFT', 'RUN_UP', 80.0, 2.8, 85)
      ON CONFLICT (ticker) DO NOTHING;
    `);
    
    console.log('   ✅ Created and Seeded earnings_pattern_memory.');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Setup Failed:', error.message);
    process.exit(1);
  }
}

migrate();
