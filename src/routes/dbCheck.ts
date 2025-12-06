import express from 'express';
import { pool } from '../db/index.js';

const router = express.Router();

router.get('/diagnose', async (req, res) => {
  // Capture config BEFORE connecting
  const dbUrl = process.env.DATABASE_URL || '';
  const configCheck = {
    url_masked: dbUrl.replace(/:[^:]*@/, ':***@'),
    is_internal: dbUrl.includes('railway.internal'),
    node_env: process.env.NODE_ENV
  };

  try {
    const client = await pool.connect();
    const resTables = await client.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public'
    `);
    const tables = resTables.rows.map(r => r.table_name);
    
    // Check row counts
    let tipsCount = -1;
    if (tables.includes('ai_stock_tips')) {
        const c = await client.query('SELECT count(*) FROM ai_stock_tips');
        tipsCount = parseInt(c.rows[0].count);
    }

    client.release();

    res.json({
      status: 'SUCCESS',
      config: configCheck,
      tables_found: tables.length,
      tips_count: tipsCount,
      tables: tables
    });

  } catch (error: any) {
    res.status(500).json({
      status: 'ERROR',
      config: configCheck,
      message: error.message,
      stack: error.stack
    });
  }
});

export default router;
