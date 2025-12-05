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
      CREATE TABLE IF NOT EXISTS prediction_results (
        id SERIAL PRIMARY KEY,
        ticker VARCHAR(20) NOT NULL,
        date_predicted TIMESTAMP DEFAULT NOW(),
        confidence_at_prediction NUMERIC,
        
        -- PHFA Targets
        entry_primary NUMERIC,
        stop_loss NUMERIC,
        take_profit_1 NUMERIC,
        take_profit_2 NUMERIC,
        take_profit_3 NUMERIC,
        
        -- Outcome Metrics
        result_outcome VARCHAR(20) DEFAULT 'PENDING', -- WIN, LOSS, NEUTRAL, PENDING
        time_to_outcome_days NUMERIC,
        performance_pnl NUMERIC,
        
        -- Excursion Data (Accuracy Validation)
        max_favorable_excursion NUMERIC, -- Highest price reached while open
        max_adverse_excursion NUMERIC,   -- Lowest price reached while open
        
        -- Hit Flags
        hit_take_profit_1 BOOLEAN DEFAULT FALSE,
        hit_stop_loss BOOLEAN DEFAULT FALSE,
        
        -- Deep Brain Snapshot (For Audit)
        agent_signals JSONB,
        
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // Index for fast retrieval
    await client.query(`CREATE INDEX IF NOT EXISTS idx_pot_ticker_date ON prediction_results(ticker, date_predicted DESC)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_pot_outcome ON prediction_results(result_outcome)`);

    await client.query('COMMIT');
    console.log('✅ POT Schema Applied (prediction_results table).');
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
