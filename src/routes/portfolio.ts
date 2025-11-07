import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { portfolioService } from '../services/portfolio.js';

const router = Router();

// GET /api/portfolio - Get user's portfolios
router.get('/', authenticate, async (req, res) => {
  try {
    const portfolios = await portfolioService.getUserPortfolios(req.user!.userId);
    res.json(portfolios);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/portfolio - Create new portfolio
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, type, startingCash } = req.body;
    
    if (!name || !type) {
      return res.status(400).json({ error: 'name and type required' });
    }

    const portfolio = await portfolioService.createPortfolio(
      req.user!.userId,
      name,
      type,
      startingCash || 100000
    );
    
    res.json(portfolio);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// GET /api/portfolio/:id - Get portfolio by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const portfolioId = parseInt(req.params.id);
    const portfolio = await portfolioService.getPortfolioById(portfolioId, req.user!.userId);
    res.json(portfolio);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

// GET /api/portfolio/:id/performance - Get portfolio performance
router.get('/:id/performance', authenticate, async (req, res) => {
  try {
    const portfolioId = parseInt(req.params.id);
    const performance = await portfolioService.getPortfolioPerformance(portfolioId);
    res.json(performance);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/portfolio/:id/trades - Get portfolio trades
router.get('/:id/trades', authenticate, async (req, res) => {
  try {
    const portfolioId = parseInt(req.params.id);
    const limit = parseInt(req.query.limit as string) || 50;
    const trades = await portfolioService.getPortfolioTrades(portfolioId, limit);
    res.json(trades);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/portfolio/:id/statistics - Get trade statistics
router.get('/:id/statistics', authenticate, async (req, res) => {
  try {
    const portfolioId = parseInt(req.params.id);
    const stats = await portfolioService.getTradeStatistics(portfolioId);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/portfolio/:id/history - Get historical performance
router.get('/:id/history', authenticate, async (req, res) => {
  try {
    const portfolioId = parseInt(req.params.id);
    const days = parseInt(req.query.days as string) || 30;
    const history = await portfolioService.getPortfolioHistory(portfolioId, days);
    res.json(history);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/portfolio/:id/snapshot - Create daily snapshot
router.post('/:id/snapshot', authenticate, async (req, res) => {
  try {
    const portfolioId = parseInt(req.params.id);
    await portfolioService.createDailySnapshot(portfolioId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
