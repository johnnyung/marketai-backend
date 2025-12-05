import { Router } from 'express';

const router = Router();

// In-memory storage (Phase 2.5: Move to database)
const portfolios = new Map();

// GET /api/game/portfolio/:userId - Get user's portfolio
router.get('/portfolio/:userId', (req, res) => {
  const { userId } = req.params;
  const portfolio = portfolios.get(userId) || {
    userId,
    cash: 100000,
    positions: [],
    trades: [],
  };
  res.json(portfolio);
});

// POST /api/game/trade - Execute a trade
router.post('/trade', (req, res) => {
  try {
    const { userId, ticker, action, shares, price } = req.body;

    if (!userId || !ticker || !action || !shares || price === undefined) {
      return res.status(400).json({ 
        error: 'userId, ticker, action, shares, and price required' 
      });
    }

    // Get or create portfolio
    let portfolio = portfolios.get(userId) || {
      userId,
      cash: 100000,
      positions: [],
      trades: [],
    };

    const cost = shares * price;

    if (action === 'buy') {
      // Check if enough cash
      if (cost > portfolio.cash) {
        return res.status(400).json({ 
          error: 'Insufficient funds',
          required: cost,
          available: portfolio.cash,
        });
      }

      // Deduct cash
      portfolio.cash -= cost;

      // Add or update position
      const existingPos = portfolio.positions.find((p: any) => p.ticker === ticker);
      if (existingPos) {
        const totalShares = existingPos.shares + shares;
        existingPos.buyPrice = 
          (existingPos.buyPrice * existingPos.shares + price * shares) / totalShares;
        existingPos.shares = totalShares;
      } else {
        portfolio.positions.push({
          ticker,
          shares,
          buyPrice: price,
          buyDate: new Date().toISOString(),
        });
      }

      // Record trade
      portfolio.trades.unshift({
        id: `trade-${Date.now()}`,
        ticker,
        action: 'buy',
        shares,
        price,
        date: new Date().toISOString(),
      });

    } else if (action === 'sell') {
      // Find position
      const posIndex = portfolio.positions.findIndex((p: any) => p.ticker === ticker);
      if (posIndex === -1) {
        return res.status(400).json({ error: 'Position not found' });
      }

      const position = portfolio.positions[posIndex];
      if (position.shares < shares) {
        return res.status(400).json({ 
          error: 'Insufficient shares',
          requested: shares,
          available: position.shares,
        });
      }

      // Add cash
      portfolio.cash += cost;

      // Calculate P&L
      const profitLoss = (price - position.buyPrice) * shares;

      // Remove or update position
      if (position.shares === shares) {
        portfolio.positions.splice(posIndex, 1);
      } else {
        position.shares -= shares;
      }

      // Record trade
      portfolio.trades.unshift({
        id: `trade-${Date.now()}`,
        ticker,
        action: 'sell',
        shares,
        price,
        date: new Date().toISOString(),
        profitLoss,
      });
    }

    // Save portfolio
    portfolios.set(userId, portfolio);

    res.json({ 
      success: true,
      portfolio,
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/game/reset - Reset portfolio
router.post('/reset/:userId', (req, res) => {
  const { userId } = req.params;
  const portfolio = {
    userId,
    cash: 100000,
    positions: [],
    trades: [],
  };
  portfolios.set(userId, portfolio);
  res.json({ success: true, portfolio });
});

export default router;
