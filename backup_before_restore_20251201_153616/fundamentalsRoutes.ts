import express from 'express';
import fundamentalAnalysisService from '../services/fundamentalAnalysisService.js';
import fmpService from '../services/fmpService.js';
import priceService from '../services/priceService.js';
import financialHealthService from '../services/financialHealthService.js'; // NEW
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// NEW: FSI Health Check
router.get('/health/:ticker', authenticateToken, async (req, res) => {
  try {
    const result = await financialHealthService.analyze(req.params.ticker.toUpperCase());
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- EXISTING ROUTES (Preserved) ---

router.get('/vetting/:ticker', authenticateToken, async (req, res) => {
  try {
    const result = await fundamentalAnalysisService.performComprehensiveVetting(req.params.ticker.toUpperCase());
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/profile/:ticker', authenticateToken, async (req, res) => {
  try {
    const profile = await fmpService.getCompanyProfile(req.params.ticker);
    res.json({ success: true, data: profile });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/financials/:ticker', authenticateToken, async (req, res) => {
  try {
    const { ticker } = req.params;
    const [income, balance, cash, ratios] = await Promise.all([
      fmpService.getIncomeStatement(ticker),
      fmpService.getBalanceSheet(ticker),
      fmpService.getCashFlowStatement(ticker),
      fmpService.getFinancialRatios(ticker)
    ]);
    res.json({ success: true, data: { income, balance, cash, ratios } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/price/:ticker', async (req, res) => {
  try {
    const data = await priceService.getCurrentPrice(req.params.ticker);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
