import { Router } from 'express';
import { alphaVantageService } from '../services/alphavantage.js';

const router = Router();

// GET /api/market/price/:ticker - Get current price
router.get('/price/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const price = await alphaVantageService.getStockPrice(ticker);
    res.json(price);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// GET /api/market/quote/:ticker - Get detailed quote
router.get('/quote/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const quote = await alphaVantageService.getStockQuote(ticker);
    res.json(quote);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// POST /api/market/batch - Get multiple prices
router.post('/batch', async (req, res) => {
  try {
    const { tickers } = req.body;
    if (!Array.isArray(tickers)) {
      return res.status(400).json({ error: 'tickers must be an array' });
    }
    const prices = await alphaVantageService.getBatchPrices(tickers);
    res.json(prices);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
