import { pool } from "../db/index.js";
import { Router } from 'express';
import { Pool } from 'pg';
// Note: We do NOT import authenticateToken here because health should be public
import marketDataService from '../services/marketDataService.js';

const router = Router();

// PUBLIC ROUTE - No Login Required
router.get('/health', async (req, res) => {
  const health: any = {
    database: { status: 'checking', message: '...' },
    priceAPI: { status: 'checking', message: '...' }
  };

  // 1. Check Database
  try {
    await pool.query('SELECT 1');
    health.database = { status: 'healthy', message: 'Connected' };
  } catch (e: any) {
    health.database = { status: 'down', message: e.message };
  }

  // 2. Check API Key Config
  if (process.env.FMP_API_KEY) {
      health.priceAPI = { status: 'healthy', message: 'Key Configured' };
  } else {
      health.priceAPI = { status: 'degraded', message: 'No API Key' };
  }

  res.json(health);
});

export default router;
