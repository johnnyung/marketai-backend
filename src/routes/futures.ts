import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { futuresService } from '../services/futures.js';

const router = Router();

// GET /api/futures/contracts - Get all futures contracts
router.get('/contracts', async (req, res) => {
  try {
    const contracts = await futuresService.getAllContracts();
    res.json(contracts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/futures/contracts/:symbol - Get contract specs
router.get('/contracts/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const contract = await futuresService.getContractSpecs(symbol);
    res.json(contract);
  } catch (error: any) {
    res.status(404).json({ error: error.message });
  }
});

// POST /api/futures/open - Open futures position
router.post('/open', authenticate, async (req, res) => {
  try {
    const { portfolioId, symbol, contractMonth, contracts, entryPrice, isDayTrade } = req.body;

    if (!portfolioId || !symbol || !contractMonth || !contracts || !entryPrice) {
      return res.status(400).json({ 
        error: 'portfolioId, symbol, contractMonth, contracts, and entryPrice required' 
      });
    }

    const position = await futuresService.openPosition(
      portfolioId,
      symbol,
      contractMonth,
      contracts,
      entryPrice,
      isDayTrade || false
    );

    res.json({ success: true, position });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// POST /api/futures/close - Close futures position
router.post('/close', authenticate, async (req, res) => {
  try {
    const { portfolioId, positionId, exitPrice } = req.body;

    if (!portfolioId || !positionId || !exitPrice) {
      return res.status(400).json({ 
        error: 'portfolioId, positionId, and exitPrice required' 
      });
    }

    const result = await futuresService.closePosition(portfolioId, positionId, exitPrice);
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// GET /api/futures/positions/:portfolioId - Get portfolio futures positions
router.get('/positions/:portfolioId', authenticate, async (req, res) => {
  try {
    const portfolioId = parseInt(req.params.portfolioId);
    const positions = await futuresService.getPortfolioPositions(portfolioId);
    res.json(positions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/futures/update-prices - Update position prices
router.post('/update-prices', authenticate, async (req, res) => {
  try {
    const { portfolioId, prices } = req.body;
    
    if (!portfolioId || !prices) {
      return res.status(400).json({ error: 'portfolioId and prices required' });
    }

    await futuresService.updatePositionPrices(portfolioId, prices);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/futures/margin/:portfolioId - Get total margin used
router.get('/margin/:portfolioId', authenticate, async (req, res) => {
  try {
    const portfolioId = parseInt(req.params.portfolioId);
    const marginUsed = await futuresService.calculateTotalMargin(portfolioId);
    res.json({ marginUsed });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/futures/margin-call/:portfolioId - Check for margin call
router.get('/margin-call/:portfolioId', authenticate, async (req, res) => {
  try {
    const portfolioId = parseInt(req.params.portfolioId);
    const hasMarginCall = await futuresService.checkMarginCall(portfolioId);
    res.json({ hasMarginCall });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
