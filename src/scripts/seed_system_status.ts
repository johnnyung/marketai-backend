import { pool } from "../db/index.js";
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();


async function seed() {
  console.log('🔌 Connecting to Database...');
  
  const widgets = [
    'fmp', 'alpha', 'coingecko', 'whale', // Core
    'news', 'reuters', 'cnbc', 'wsj', 'youtube', // Media
    'social', 'wsb', 'stocks', // Social
    'sec', 'congress', 'whitehouse', 'senate', // Political
    'dod', 'treasury', 'doj', 'fda', // Gov
    'fred', 'tariff', 'research_agent', 'ai_analyst' // Macro/System
  ];

  try {
    for (const id of widgets) {
        // Insert if not exists, otherwise ensure it's not stuck on 'scanning'
        await pool.query(`
            INSERT INTO system_status (source_id, status, message, count, last_updated)
            VALUES ($1, 'cached', 'Monitoring', 0, NOW())
            ON CONFLICT (source_id) DO NOTHING
        `, [id]);
    }
    console.log(`✅ Initialized ${widgets.length} widgets in database.`);
  } catch (e: any) {
    console.error('❌ Seed Failed:', e.message);
  } finally {
    await pool.end();
  }
}

seed();
