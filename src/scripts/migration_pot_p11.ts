import { pool } from "../db/index.js";
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();


async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Table for tracking engine weights over time
    await client.query(`
      CREATE TABLE IF NOT EXISTS attribution_learning_snapshots (
        id SERIAL PRIMARY KEY,
        snapshot_date DATE DEFAULT CURRENT_DATE,
        
        engine_weights JSONB, -- { gamma: 1.2, insider: 0.9, ... }
        
        primary_win_driver VARCHAR(50), -- Which engine caused the most wins today?
        total_wins_analyzed INTEGER,
        
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Seed Initial Weights (Neutral)
    await client.query(`
      INSERT INTO attribution_learning_snapshots (engine_weights, primary_win_driver, total_wins_analyzed)
      VALUES ('{
        "momentum": 1.0, 
        "value": 1.0, 
        "catalyst": 1.0, 
        "shadow": 1.0, 
        "insider": 1.0, 
        "gamma": 1.0, 
        "narrative": 1.0,
        "fsi": 1.0
      }', 'INITIAL_SEED', 0);
    `);

    await client.query('COMMIT');
    console.log('✅ WDIWA Schema Applied (attribution_learning_snapshots).');
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
