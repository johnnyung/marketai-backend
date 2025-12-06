import { pool } from "../db/index.js";
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();


async function setup() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS research_priorities (
        id SERIAL PRIMARY KEY,
        topic VARCHAR(255) UNIQUE,
        source_hint VARCHAR(50), -- 'news', 'gov', 'social'
        priority_score INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP
      );
    `);
    console.log('✅ Research Memory (Priorities) Initialized.');
  } catch (e) { console.error('❌ DB Setup Failed:', e); }
  finally { await pool.end(); }
}
setup();
