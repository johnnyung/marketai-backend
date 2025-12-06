import { pool } from "../db/index.js";

async function run() {
  console.log("🚀 Setting up MarketAI core schema...");

  try {
    // USERS
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // USER PORTFOLIOS
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_portfolios (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        name TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // AI TIPS
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_tips (
        id SERIAL PRIMARY KEY,
        symbol TEXT NOT NULL,
        rating TEXT,
        confidence NUMERIC,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // INTELLIGENCE THREADS
    await pool.query(`
      CREATE TABLE IF NOT EXISTS intelligence_threads (
        id SERIAL PRIMARY KEY,
        symbol TEXT,
        thread JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log("✅ Core MarketAI schema created.");
  } catch (err) {
    console.error("❌ Schema creation error:", err);
  } finally {
    pool.end();
  }
}

run();
