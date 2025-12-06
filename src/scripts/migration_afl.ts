import { pool } from "../db/index.js";
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();


async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Engine Weights Table (The "Brain's Biases")
    await client.query(`
      CREATE TABLE IF NOT EXISTS engine_weights (
        engine_id VARCHAR(50) PRIMARY KEY,
        weight DECIMAL DEFAULT 1.0,
        accuracy_score DECIMAL DEFAULT 50.0,
        wins INTEGER DEFAULT 0,
        losses INTEGER DEFAULT 0,
        last_updated TIMESTAMP DEFAULT NOW()
      );
    `);

    // 2. System Adaptations (Global Parameters)
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_adaptations (
        param_key VARCHAR(50) PRIMARY KEY,
        param_value DECIMAL,
        description TEXT,
        last_updated TIMESTAMP DEFAULT NOW()
      );
    `);

    // Seed default adaptations if empty
    await client.query(`
      INSERT INTO system_adaptations (param_key, param_value, description)
      VALUES
        ('stop_loss_padding', 1.0, 'Multiplier for ATR-based stops'),
        ('conviction_threshold', 70.0, 'Score required for HIGH conviction'),
        ('max_allocation_cap', 0.15, 'Maximum portfolio % per trade')
      ON CONFLICT DO NOTHING;
    `);

    await client.query('COMMIT');
    console.log('✅ AFL Schema Applied (engine_weights, system_adaptations).');
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
