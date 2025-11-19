// src/routes/systemStatusRoutes.ts
import express from 'express';
import pool from '../db/index.js';

const router = express.Router();

// Comprehensive system status
router.get('/status/detailed', async (req, res) => {
  try {
    const status: any = {
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      dataSources: {},
      apiKeys: {},
      dataQuality: {}
    };

    // Check database
    try {
      await pool.query('SELECT NOW()');
      status.database = 'connected';
    } catch (error) {
      status.database = 'error';
    }

    // Check API keys
    status.apiKeys = {
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      alphaVantage: !!process.env.ALPHA_VANTAGE_API_KEY,
      newsAPI: !!process.env.NEWS_API_KEY,
      sec: true // SEC is public
    };

    // Check data collections in last hour
    try {
      const collections = await pool.query(`
        SELECT 
          source_type,
          source_name,
          COUNT(*) as count,
          MAX(collected_at) as last_collected,
          COUNT(*) FILTER (WHERE data_json::text LIKE '%simulated%') as mock_count,
          COUNT(*) FILTER (WHERE data_json::text NOT LIKE '%simulated%') as real_count
        FROM raw_data_collection
        WHERE collected_at > NOW() - INTERVAL '1 hour'
        GROUP BY source_type, source_name
        ORDER BY source_type, count DESC
      `);

      status.dataSources = collections.rows.reduce((acc: any, row: any) => {
        if (!acc[row.source_type]) acc[row.source_type] = [];
        acc[row.source_type].push({
          name: row.source_name,
          count: parseInt(row.count),
          lastCollected: row.last_collected,
          realData: parseInt(row.real_count) > parseInt(row.mock_count),
          mockCount: parseInt(row.mock_count),
          realCount: parseInt(row.real_count)
        });
        return acc;
      }, {});

      // Calculate data quality score
      const totalReal = collections.rows.reduce((sum, row) => sum + parseInt(row.real_count), 0);
      const totalMock = collections.rows.reduce((sum, row) => sum + parseInt(row.mock_count), 0);
      const total = totalReal + totalMock;

      status.dataQuality = {
        realDataPercentage: total > 0 ? Math.round((totalReal / total) * 100) : 0,
        totalItemsLastHour: total,
        realItems: totalReal,
        mockItems: totalMock,
        assessment: totalReal > totalMock ? 'GOOD' : 'NEEDS_APIS'
      };
    } catch (error) {
      console.error('Data quality check error:', error);
    }

    // Check active collectors
    try {
      const activeCollectors = await pool.query(`
        SELECT DISTINCT source_name, MAX(collected_at) as last_run
        FROM raw_data_collection
        WHERE collected_at > NOW() - INTERVAL '15 minutes'
        GROUP BY source_name
        ORDER BY last_run DESC
      `);

      status.activeCollectors = activeCollectors.rows.map(row => ({
        name: row.source_name,
        lastRun: row.last_run,
        status: 'active'
      }));
    } catch (error) {
      status.activeCollectors = [];
    }

    res.json({
      success: true,
      data: status
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Real-time price check (verifies actual API connection)
router.get('/verify/prices', async (req, res) => {
  const results: any = {
    timestamp: new Date().toISOString(),
    sources: []
  };

  // Test Alpha Vantage
  if (process.env.ALPHA_VANTAGE_API_KEY) {
    try {
      const axios = (await import('axios')).default;
      const response = await axios.get(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=SPY&apikey=${process.env.ALPHA_VANTAGE_API_KEY}`,
        { timeout: 5000 }
      );
      
      const quote = response.data['Global Quote'];
      if (quote && quote['05. price']) {
        results.sources.push({
          name: 'Alpha Vantage',
          status: 'connected',
          dataType: 'real',
          sample: {
            symbol: 'SPY',
            price: parseFloat(quote['05. price']),
            change: parseFloat(quote['09. change']),
            timestamp: quote['07. latest trading day']
          }
        });
      } else {
        results.sources.push({
          name: 'Alpha Vantage',
          status: 'error',
          dataType: 'unknown',
          error: 'Invalid response format'
        });
      }
    } catch (error: any) {
      results.sources.push({
        name: 'Alpha Vantage',
        status: 'error',
        dataType: 'unknown',
        error: error.message
      });
    }
  } else {
    results.sources.push({
      name: 'Alpha Vantage',
      status: 'not_configured',
      dataType: 'none',
      error: 'API key missing'
    });
  }

  // Test CoinGecko (free, no key needed)
  try {
    const axios = (await import('axios')).default;
    const response = await axios.get(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true',
      { timeout: 5000 }
    );
    
    if (response.data.bitcoin) {
      results.sources.push({
        name: 'CoinGecko',
        status: 'connected',
        dataType: 'real',
        sample: {
          bitcoin: response.data.bitcoin.usd,
          ethereum: response.data.ethereum.usd
        }
      });
    }
  } catch (error: any) {
    results.sources.push({
      name: 'CoinGecko',
      status: 'error',
      dataType: 'unknown',
      error: error.message
    });
  }

  const connectedCount = results.sources.filter((s: any) => s.status === 'connected').length;
  results.summary = {
    total: results.sources.length,
    connected: connectedCount,
    percentage: Math.round((connectedCount / results.sources.length) * 100)
  };

  res.json({
    success: true,
    data: results
  });
});

export default router;
