import express from 'express';
import pool from '../db/index.js';

const router = express.Router();

router.get('/diagnose', async (req, res) => {
  try {
    // 1. Check Connection
    const client = await pool.connect();
    
    // 2. Get Table List
    const tablesRes = await client.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public'
    `);
    const tables = tablesRes.rows.map(r => r.table_name);

    // 3. Get Row Counts (Critical Validation)
    let tipsCount = 0;
    if (tables.includes('ai_stock_tips')) {
        const countRes = await client.query('SELECT count(*) FROM ai_stock_tips');
        tipsCount = parseInt(countRes.rows[0].count);
    }

    client.release();

    // 4. Report
    res.json({
      status: 'SUCCESS',
      connected: true,
      database_url_masked: process.env.DATABASE_URL?.split('@')[1], // Show host only
      table_count: tables.length,
      has_critical_tables: tables.includes('ai_stock_tips'),
      tips_row_count: tipsCount,
      tables_list: tables
    });

  } catch (error: any) {
    res.status(500).json({
      status: 'ERROR',
      message: error.message,
      stack: error.stack
    });
  }
});

export default router;
