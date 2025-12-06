import { pool } from "../db/index.js";
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();


async function seed() {
  console.log('🔌 Connecting to Database...');
  
  // All widget IDs used in V2Dashboard.tsx
  const widgets = [
    'fmp', 'alpha', 'coingecko', 'whale',
    'news', 'reuters', 'cnbc', 'wsj', 'youtube',
    'social', 'wsb', 'stocks',
    'sec', 'congress', 'whitehouse', 'senate',
    'dod', 'treasury', 'doj', 'fda',
    'fred', 'tariff', 'research_agent', 'ai_analyst'
  ];

  try {
    for (const id of widgets) {
        // Upsert status to ensure it's not empty
        await pool.query(`
            INSERT INTO system_status (source_id, status, message, count, last_updated)
            VALUES ($1, 'cached', 'System Ready', 0, NOW())
            ON CONFLICT (source_id) DO UPDATE SET
                status = CASE WHEN system_status.status = 'error' THEN 'cached' ELSE system_status.status END,
                message = CASE WHEN system_status.message = 'Waiting...' THEN 'System Ready' ELSE system_status.message END
        `, [id]);
        process.stdout.write('.');
    }
    console.log('\n✅ Widget Statuses Seeded.');
  } catch (e: any) {
    console.error('❌ Seed Failed:', e.message);
  } finally {
    await pool.end();
  }
}

seed();
