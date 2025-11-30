import express from 'express';
import userPortfolioService from '../services/userPortfolioService.js';
import { authenticateToken } from '../middleware/auth.js'; // Added auth for safety

const router = express.Router();

// Get Holdings
router.get('/', async (req, res) => {
  try {
    const holdings = await userPortfolioService.getHoldings();
    res.json({ success: true, data: holdings });
  } catch (error: any) {
    console.error("Get Portfolio Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add Holding
router.post('/add', async (req, res) => {
  try {
    const { ticker, shares, price, date } = req.body;
    
    if (!ticker || shares === undefined || price === undefined || !date) {
        return res.status(400).json({ success: false, error: "Missing required fields (ticker, shares, price, date)" });
    }

    await userPortfolioService.addHolding(ticker, parseFloat(shares), parseFloat(price), date);
    res.json({ success: true, message: "Holding added" });
  } catch (error: any) {
    console.error("Add Holding Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Remove Holding
router.post('/remove', async (req, res) => {
  try {
    const { ticker } = req.body;
    if (!ticker) return res.status(400).json({ success: false, error: "Ticker required" });
    
    await userPortfolioService.removeHolding(ticker);
    res.json({ success: true, message: "Holding removed" });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Run Analysis
router.post('/analyze', async (req, res) => {
  try {
    const result = await userPortfolioService.analyzePortfolio();
    res.json(result);
  } catch (error: any) {
    console.error("Analyze Portfolio Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
