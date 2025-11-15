// backend/src/routes/system.ts
import { Router } from 'express';
import { Pool } from 'pg';
import { authenticateToken } from '../middleware/auth.js';
import marketDataService from '../services/marketDataService.js';

const router = Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// System health check endpoint
router.get('/health', authenticateToken, async (req, res) => {
  try {
    const health: any = {
      database: { status: 'down', message: 'Not connected' },
      priceAPI: { status: 'down', message: 'No price data available' },
      claudeAI: { status: 'down', message: 'API key not configured' },
      digestData: { status: 'down', message: 'No recent data', count: 0 },
      threads: { status: 'down', message: 'No threads found', count: 0 },
      signals: { status: 'down', message: 'No signals found', count: 0 }
    };

    // Check database
    try {
      await pool.query('SELECT 1');
      health.database = {
        status: 'healthy',
        message: 'Database connected'
      };
    } catch (error) {
      health.database = {
        status: 'down',
        message: 'Database connection failed'
      };
    }

    // Check Claude AI
    if (process.env.ANTHROPIC_API_KEY) {
      health.claudeAI = {
        status: 'healthy',
        message: 'Claude AI configured'
      };
    } else {
      health.claudeAI = {
        status: 'down',
        message: 'API key missing'
      };
    }

    // Check price API
    try {
      const testPrice = await marketDataService.getStockPrice('AAPL');
      if (testPrice) {
        health.priceAPI = {
          status: 'healthy',
          message: 'Price API working',
          source: testPrice.source
        };
      } else {
        health.priceAPI = {
          status: 'degraded',
          message: 'Price API slow or limited'
        };
      }
    } catch (error) {
      health.priceAPI = {
        status: 'degraded',
        message: 'Price API issues'
      };
    }

    // Check digest data (FIXED: Look at last 7 days instead of just today)
    try {
      const digestResult = await pool.query(`
        SELECT COUNT(*) as count
        FROM digest_entries
        WHERE created_at >= NOW() - INTERVAL '7 days'
      `);
      
      const count = parseInt(digestResult.rows[0]?.count || 0);
      
      if (count >= 100) {
        health.digestData = {
          status: 'healthy',
          message: `${count} entries in last 7 days`,
          count
        };
      } else if (count >= 10) {
        health.digestData = {
          status: 'degraded',
          message: `Only ${count} entries in last 7 days`,
          count
        };
      } else {
        health.digestData = {
          status: 'down',
          message: count > 0 ? `Only ${count} entries` : 'No recent data',
          count
        };
      }
    } catch (error) {
      health.digestData = {
        status: 'down',
        message: 'Failed to check digest data',
        count: 0
      };
    }

    // Check intelligence threads (last 7 days)
    try {
      const threadsResult = await pool.query(`
        SELECT COUNT(*) as count
        FROM intelligence_threads
        WHERE created_at >= NOW() - INTERVAL '7 days'
      `);
      
      const count = parseInt(threadsResult.rows[0]?.count || 0);
      
      if (count >= 3) {
        health.threads = {
          status: 'healthy',
          message: `${count} threads this week`,
          count
        };
      } else if (count >= 1) {
        health.threads = {
          status: 'degraded',
          message: `Only ${count} thread(s) this week`,
          count
        };
      } else {
        health.threads = {
          status: 'down',
          message: 'No threads this week',
          count: 0
        };
      }
    } catch (error) {
      health.threads = {
        status: 'down',
        message: 'Failed to check threads',
        count: 0
      };
    }

    // Check AI signals (last 7 days)
    try {
      const signalsResult = await pool.query(`
        SELECT COUNT(*) as count
        FROM ai_signals
        WHERE created_at >= NOW() - INTERVAL '7 days'
      `);
      
      const count = parseInt(signalsResult.rows[0]?.count || 0);
      
      if (count >= 5) {
        health.signals = {
          status: 'healthy',
          message: `${count} signals this week`,
          count
        };
      } else if (count >= 1) {
        health.signals = {
          status: 'degraded',
          message: `Only ${count} signal(s) this week`,
          count
        };
      } else {
        health.signals = {
          status: 'down',
          message: 'No signals this week',
          count: 0
        };
      }
    } catch (error) {
      health.signals = {
        status: 'down',
        message: 'Failed to check signals',
        count: 0
      };
    }

    res.json(health);
  } catch (error: any) {
    console.error('Health check failed:', error);
    res.status(500).json({
      error: 'Health check failed',
      message: error.message
    });
  }
});

export default router;
