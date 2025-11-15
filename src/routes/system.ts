// backend/src/routes/system.ts
import { Router } from 'express';
import { Pool } from 'pg';
import axios from 'axios';

const router = Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

router.get('/health', async (req, res) => {
  const health = {
    timestamp: new Date().toISOString(),
    overall: 'healthy',
    components: {} as any
  };

  try {
    health.components.database = await checkDatabase();
    health.components.digestData = await checkDigestData();
    health.components.threads = await checkThreads();
    health.components.signals = await checkSignals();
    health.components.priceAPI = await checkPriceAPI();
    health.components.claudeAPI = await checkClaudeAPI();

    const allHealthy = Object.values(health.components).every(
      (component: any) => component.status === 'healthy'
    );
    const anyDegraded = Object.values(health.components).some(
      (component: any) => component.status === 'degraded'
    );
    const anyCritical = Object.values(health.components).some(
      (component: any) => component.status === 'critical'
    );

    if (anyCritical) health.overall = 'critical';
    else if (anyDegraded) health.overall = 'degraded';
    else if (allHealthy) health.overall = 'healthy';

    res.json(health);
  } catch (error: any) {
    res.status(500).json({
      overall: 'critical',
      error: error.message,
      components: health.components
    });
  }
});

async function checkDatabase() {
  try {
    await pool.query('SELECT 1');
    return { status: 'healthy', message: 'Database connected' };
  } catch (error: any) {
    return { status: 'critical', message: 'Database connection failed', error: error.message };
  }
}

async function checkDigestData() {
  try {
    const result = await pool.query(`
      SELECT COUNT(*) as total,
             COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as today
      FROM digest_entries
    `);
    const { total, today } = result.rows[0];
    
    if (today === '0') {
      return {
        status: 'critical',
        message: 'No digest data from today',
        total: parseInt(total),
        today: 0
      };
    }
    return {
      status: 'healthy',
      message: `${today} entries today`,
      total: parseInt(total),
      today: parseInt(today)
    };
  } catch (error: any) {
    return { status: 'critical', message: 'Digest table error', error: error.message };
  }
}

async function checkThreads() {
  try {
    const result = await pool.query(`
      SELECT COUNT(*) as total,
             COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as today
      FROM intelligence_threads
    `);
    const { total, today } = result.rows[0];
    
    return {
      status: today === '0' ? 'degraded' : 'healthy',
      message: `${today} threads today`,
      total: parseInt(total),
      today: parseInt(today)
    };
  } catch (error: any) {
    return { status: 'degraded', message: 'Threads table error', error: error.message };
  }
}

async function checkSignals() {
  try {
    const result = await pool.query(`
      SELECT COUNT(*) as total,
             COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as today,
             COUNT(*) FILTER (WHERE status = 'OPEN') as open
      FROM ai_tip_tracker
    `);
    const { total, today, open } = result.rows[0];
    
    return {
      status: total === '0' ? 'degraded' : 'healthy',
      message: `${today} signals today (${open} open)`,
      total: parseInt(total),
      today: parseInt(today),
      open: parseInt(open)
    };
  } catch (error: any) {
    return { status: 'degraded', message: 'Signals table error', error: error.message };
  }
}

async function checkPriceAPI() {
  try {
    const alphavantageKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (!alphavantageKey) {
      return { status: 'critical', message: 'Alpha Vantage key not configured' };
    }

    const response = await axios.get(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL&apikey=${alphavantageKey}`,
      { timeout: 5000 }
    );

    if (response.data['Global Quote']?.['05. price']) {
      return { status: 'healthy', message: 'Price API working', source: 'Alpha Vantage' };
    }
    
    const finnhubKey = process.env.FINNHUB_API_KEY;
    if (finnhubKey) {
      const finnhubResponse = await axios.get(
        `https://finnhub.io/api/v1/quote?symbol=AAPL&token=${finnhubKey}`,
        { timeout: 5000 }
      );
      
      if (finnhubResponse.data?.c) {
        return { status: 'healthy', message: 'Price API working', source: 'Finnhub' };
      }
    }

    return { status: 'degraded', message: 'Price APIs limited' };
  } catch (error: any) {
    return { status: 'critical', message: 'All price APIs failed', error: error.message };
  }
}

async function checkClaudeAPI() {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return { status: 'critical', message: 'Claude API key not configured' };
    }

    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'test' }]
      },
      {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        timeout: 10000
      }
    );

    return { status: 'healthy', message: 'Claude API working' };
  } catch (error: any) {
    if (error.response?.status === 401) {
      return { status: 'critical', message: 'Claude API key invalid' };
    }
    return { status: 'degraded', message: 'Claude API error', error: error.message };
  }
}

export default router;
