import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import userPortfolioService from '../services/userPortfolioService.js';

const router = express.Router();

// Get DB Holdings
router.get('/', authenticateToken, async (req, res) => {
    try {
        // @ts-ignore
        const holdings = await userPortfolioService.getHoldings(req.user?.userId || 1);
        res.json(holdings);
    } catch (e) {
        res.status(500).json({ error: 'Failed to fetch holdings' });
    }
});

// Analyze DB Portfolio
router.post('/analyze', authenticateToken, async (req, res) => {
    try {
        const { positions } = req.body;

        // If positions provided in body, analyze those (Dynamic Mode)
        // Otherwise analyze DB holdings (Saved Mode)
        
        if (positions && Array.isArray(positions)) {
            const analysis = await userPortfolioService.analyzeDynamicPortfolio(positions);
            return res.json(analysis);
        }

        // @ts-ignore
        const analysis = await userPortfolioService.analyzePortfolio(req.user?.userId || 1);
        res.json(analysis);
    } catch (e: any) {
        res.status(500).json({ error: 'Portfolio analysis failed', details: e.message });
    }
});

// Add Holding
router.post('/add', authenticateToken, async (req, res) => {
    try {
        const { ticker, shares, price } = req.body;
        // @ts-ignore
        await userPortfolioService.addHolding(ticker, shares, price, req.user?.userId || 1);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed to add holding' });
    }
});

export default router;
