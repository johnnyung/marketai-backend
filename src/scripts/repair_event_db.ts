import { pool } from "../db/index.js";
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();


async function repair() {
  console.log('🔌 Connecting to Database...');
  
  try {
    // 1. Drop the old table to ensure clean state
    console.log('   🗑️  Dropping old event_analyses table...');
    await pool.query('DROP TABLE IF EXISTS event_analyses');

    // 2. Create with ALL required columns
    console.log('   ✨ Recreating table with correct schema...');
    await pool.query(`
      CREATE TABLE event_analyses (
        id SERIAL PRIMARY KEY,
        url TEXT,                    -- The missing column
        user_notes TEXT,
        article_title TEXT,
        article_summary TEXT,
        ai_validation TEXT,
        found_correlations JSONB,
        trading_opportunities JSONB,
        affected_tickers TEXT[],     -- Added for robust storage
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('✅ Database Repair Complete. "url" column is now ready.');

  } catch (error: any) {
    console.error('❌ Repair Failed:', error.message);
  } finally {
    await pool.end();
  }
}

repair();
