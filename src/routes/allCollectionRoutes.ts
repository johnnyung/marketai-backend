// src/routes/allCollectionRoutes.ts - COMPREHENSIVE DATA COLLECTION
import express from 'express';
import pool from '../db/index.js';
import axios from 'axios';

const router = express.Router();

async function storeData(sourceType: string, sourceName: string, data: any) {
  try {
    await pool.query(`
      INSERT INTO raw_data_collection (source_type, source_name, data_json, collected_at)
      VALUES ($1, $2, $3, NOW())
    `, [sourceType, sourceName, data]);
  } catch (error) {
    console.error(`❌ ${sourceName}:`, error);
  }
}

// ==================== MARKET DATA ====================

// Alpha Vantage - Stock prices
router.post('/stocks', async (req, res) => {
  const API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
  if (!API_KEY) return res.json({ success: false, error: 'ALPHA_VANTAGE_API_KEY missing' });

  try {
    const tickers = ['SPY', 'QQQ', 'AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NFLX'];
    let count = 0;
    
    for (const ticker of tickers) {
      const response = await axios.get(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${API_KEY}`
      );
      
      if (response.data['Global Quote']) {
        const q = response.data['Global Quote'];
        await storeData('market', 'Alpha Vantage', {
          symbol: ticker,
          price: parseFloat(q['05. price']),
          change: parseFloat(q['09. change']),
          changePercent: q['10. change percent'],
          volume: parseInt(q['06. volume']),
          timestamp: q['07. latest trading day']
        });
        count++;
      }
      await new Promise(resolve => setTimeout(resolve, 12000));
    }
    
    console.log(`✅ Alpha Vantage: ${count} stocks`);
    res.json({ success: true, data: { itemsProcessed: count } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Alpha Vantage failed' });
  }
});

// Finnhub - Market data, news, earnings
router.post('/finnhub', async (req, res) => {
  const API_KEY = process.env.FINNHUB_API_KEY;
  if (!API_KEY) return res.json({ success: false, error: 'FINNHUB_API_KEY missing' });

  try {
    let count = 0;
    const tickers = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOGL'];
    
    for (const ticker of tickers) {
      // Quote
      const quote = await axios.get(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${API_KEY}`);
      await storeData('market', 'Finnhub Quote', { symbol: ticker, ...quote.data });
      
      // Company news
      const news = await axios.get(`https://finnhub.io/api/v1/company-news?symbol=${ticker}&from=2024-01-01&to=2025-12-31&token=${API_KEY}`);
      for (const article of news.data.slice(0, 5)) {
        await storeData('news', 'Finnhub News', { ticker, ...article });
      }
      
      count += 6;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`✅ Finnhub: ${count} items`);
    res.json({ success: true, data: { itemsProcessed: count } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Finnhub failed' });
  }
});

// FMP - Financial Modeling Prep
router.post('/fmp', async (req, res) => {
  const API_KEY = process.env.FMP_API_KEY;
  if (!API_KEY) return res.json({ success: false, error: 'FMP_API_KEY missing' });

  try {
    let count = 0;
    
    // Market news
    const news = await axios.get(`https://financialmodelingprep.com/stable/stock_news?limit=50&apikey=${API_KEY}`);
    for (const article of news.data) {
      await storeData('news', 'FMP News', article);
      count++;
    }
    
    // Economic calendar
    const calendar = await axios.get(`https://financialmodelingprep.com/stable/economic_calendar?apikey=${API_KEY}`);
    for (const event of calendar.data.slice(0, 20)) {
      await storeData('macro', 'FMP Economic Calendar', event);
      count++;
    }
    
    // Insider trading
    const insider = await axios.get(`https://financialmodelingprep.com/stable/insider-trading?limit=100&apikey=${API_KEY}`);
    for (const trade of insider.data) {
      await storeData('insider', 'FMP Insider Trading', trade);
      count++;
    }
    
    console.log(`✅ FMP: ${count} items`);
    res.json({ success: true, data: { itemsProcessed: count } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'FMP failed' });
  }
});

// ==================== ECONOMIC DATA ====================

// FRED - Federal Reserve Economic Data
router.post('/fred', async (req, res) => {
  const API_KEY = process.env.FRED_KEY;
  if (!API_KEY) return res.json({ success: false, error: 'FRED_KEY missing' });

  try {
    let count = 0;
    const series = [
      'GDP', 'UNRATE', 'CPIAUCSL', 'FEDFUNDS', 'DGS10', 'DFF', 
      'T10Y2Y', 'DEXUSEU', 'DEXCHUS', 'VIXCLS'
    ];
    
    for (const seriesId of series) {
      const response = await axios.get(
        `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${API_KEY}&file_type=json&limit=10&sort_order=desc`
      );
      
      for (const obs of response.data.observations) {
        await storeData('macro', 'FRED Economic Data', {
          series: seriesId,
          date: obs.date,
          value: parseFloat(obs.value),
          realtime_start: obs.realtime_start
        });
        count++;
      }
    }
    
    console.log(`✅ FRED: ${count} data points`);
    res.json({ success: true, data: { itemsProcessed: count } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'FRED failed' });
  }
});

// ==================== CRYPTO ====================

// CoinGecko - Crypto prices
router.post('/crypto', async (req, res) => {
  try {
    const response = await axios.get(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,cardano,solana,ripple,dogecoin,polkadot,avalanche-2,chainlink,polygon&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true'
    );
    
    let count = 0;
    for (const [coin, data] of Object.entries(response.data)) {
      await storeData('crypto', 'CoinGecko', { 
        coin, 
        usd: (data as any).usd,
        usd_24h_change: (data as any).usd_24h_change,
        usd_24h_vol: (data as any).usd_24h_vol,
        usd_market_cap: (data as any).usd_market_cap
      });
      count++;
    }
    
    console.log(`✅ CoinGecko: ${count} coins`);
    res.json({ success: true, data: { itemsProcessed: count } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'CoinGecko failed' });
  }
});

// ==================== NEWS ====================

// NewsAPI - Financial news
router.post('/news', async (req, res) => {
  const API_KEY = process.env.NEWS_API_KEY;
  if (!API_KEY) return res.json({ success: false, error: 'NEWS_API_KEY missing' });

  try {
    const topics = [
      'stock market', 'federal reserve', 'inflation', 'earnings', 
      'economy', 'cryptocurrency', 'tech stocks', 'oil prices'
    ];
    
    let count = 0;
    for (const topic of topics) {
      const response = await axios.get(
        `https://newsapi.org/v2/everything?q=${encodeURIComponent(topic)}&sortBy=publishedAt&language=en&apiKey=${API_KEY}&pageSize=10`
      );
      
      for (const article of response.data.articles) {
        await storeData('news', 'NewsAPI', {
          topic,
          title: article.title,
          description: article.description,
          url: article.url,
          publishedAt: article.publishedAt,
          source: article.source.name
        });
        count++;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`✅ NewsAPI: ${count} articles`);
    res.json({ success: true, data: { itemsProcessed: count } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'NewsAPI failed' });
  }
});

// ==================== SOCIAL ====================

// Reddit - WallStreetBets + investing
router.post('/reddit', async (req, res) => {
  const CLIENT_ID = process.env.REDDIT_CLIENT_ID;
  const CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET;
  
  if (!CLIENT_ID || !CLIENT_SECRET) {
    return res.json({ success: false, error: 'REDDIT credentials missing' });
  }

  try {
    // Get access token - FIXED auth format
    const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
    
    const tokenResponse = await axios.post(
      'https://www.reddit.com/api/v1/access_token',
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'MarketAI/1.0'
        }
      }
    );
    
    const token = tokenResponse.data.access_token;
    let count = 0;
    
    const subreddits = ['wallstreetbets', 'stocks', 'investing', 'options'];
    
    for (const sub of subreddits) {
      const posts = await axios.get(
        `https://oauth.reddit.com/r/${sub}/hot.json?limit=25`,
        { 
          headers: { 
            'Authorization': `Bearer ${token}`, 
            'User-Agent': 'MarketAI/1.0' 
          } 
        }
      );
      
      for (const post of posts.data.data.children) {
        const p = post.data;
        await storeData('social', 'Reddit', {
          subreddit: sub,
          title: p.title,
          selftext: p.selftext,
          score: p.score,
          num_comments: p.num_comments,
          created: p.created_utc,
          url: `https://reddit.com${p.permalink}`
        });
        count++;
      }
    }
    
    console.log(`✅ Reddit: ${count} posts`);
    res.json({ success: true, data: { itemsProcessed: count } });
  } catch (error: any) {
    console.error('Reddit error:', error.response?.data || error.message);
    res.status(500).json({ success: false, error: 'Reddit failed' });
  }
});

// ==================== FREE ALTERNATIVES ====================

// SEC EDGAR - Free regulatory filings
router.post('/sec', async (req, res) => {
  try {
    // Use RSS feed instead of direct API (no rate limits)
    const response = await axios.get(
      'https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&CIK=&type=&company=&dateb=&owner=include&start=0&count=40&output=atom',
      { headers: { 'User-Agent': 'MarketAI research@marketai.com' }}
    );
    
    let count = 0;
    // Parse XML response for filings
    const entries = response.data.match(/<entry>[\s\S]*?<\/entry>/g) || [];
    
    for (const entry of entries.slice(0, 20)) {
      const title = entry.match(/<title>(.*?)<\/title>/)?.[1];
      const updated = entry.match(/<updated>(.*?)<\/updated>/)?.[1];
      
      if (title && updated) {
        await storeData('regulatory', 'SEC EDGAR', {
          filing: title,
          date: updated,
          source: 'RSS Feed'
        });
        count++;
      }
    }
    
    console.log(`✅ SEC: ${count} filings`);
    res.json({ success: true, data: { itemsProcessed: count } });
  } catch (error: any) {
    console.error('SEC error:', error.message);
    res.status(500).json({ success: false, error: 'SEC failed' });
  }
});

// YouTube Finance - Free RSS feeds
router.post('/youtube', async (req, res) => {
  try {
    const channels = [
      { id: 'UCXuqSBlHAE6Xw-yeJA0Tunw', name: 'CNBC' },
      { id: 'UCiYca1SQkxACoarCq_BmDjw', name: 'Bloomberg' }
    ];
    
    let count = 0;
    for (const channel of channels) {
      const response = await axios.get(
        `https://www.youtube.com/feeds/videos.xml?channel_id=${channel.id}`
      );
      await storeData('media', 'YouTube Finance', {
        channel: channel.name,
        feed: response.data
      });
      count++;
    }
    
    console.log(`✅ YouTube: ${count} channels`);
    res.json({ success: true, data: { itemsProcessed: count } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'YouTube failed' });
  }
});

// Placeholder routes that return "not configured"
const placeholderRoutes = [
  '/options', '/futures', '/indices', '/extended', '/etf-flows', 
  '/darkpool', '/short-interest', '/defi', '/nft', '/whale-tracking',
  '/twitter', '/stocktwits', '/influencers', '/discord',
  '/political', '/earnings', '/press', '/analyst-ratings', '/interviews',
  '/insider', '/institutional', '/hedgefunds', '/activists', '/exec-comp',
  '/ipo', '/spac', '/fda', '/fed', '/economic', '/treasury', 
  '/geopolitical', '/dollar', '/commodities', '/crypto-sentiment'
];

placeholderRoutes.forEach(route => {
  router.post(route, (req, res) => {
    res.json({ 
      success: false, 
      error: 'Not implemented - requires paid API subscription'
    });
  });
});

// ==================== MASTER COLLECTOR ====================

router.post('/collect-all', async (req, res) => {
  console.log('🚀 Starting comprehensive data collection...');
  
  const results: any = {
    success: [],
    failed: []
  };
  
  const endpoints = [
    { name: 'Alpha Vantage', path: '/stocks' },
    { name: 'Finnhub', path: '/finnhub' },
    { name: 'FMP', path: '/fmp' },
    { name: 'FRED', path: '/fred' },
    { name: 'CoinGecko', path: '/crypto' },
    { name: 'NewsAPI', path: '/news' },
    { name: 'Reddit', path: '/reddit' },
    { name: 'SEC EDGAR', path: '/sec' },
    { name: 'YouTube', path: '/youtube' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await axios.post(`http://localhost:${process.env.PORT || 8080}/api/collect${endpoint.path}`);
      if (response.data.success) {
        results.success.push(endpoint.name);
      } else {
        results.failed.push({ name: endpoint.name, error: response.data.error });
      }
    } catch (error) {
      results.failed.push({ name: endpoint.name, error: 'Request failed' });
    }
  }
  
  console.log(`✅ Collection complete: ${results.success.length} sources succeeded`);
  res.json({ success: true, data: results });
});

export default router;
