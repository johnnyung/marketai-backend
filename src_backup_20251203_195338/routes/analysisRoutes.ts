import express from 'express';
import analysisService from '../services/analysisService.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Command Center: Step 2 (Analyze)
router.post('/analyze', authenticateToken, async (req, res) => {
    try {
        const result = await analysisService.runFullAnalysis();
        res.json(result);
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Macro Widget
router.get('/macro', async (req, res) => {
    try {
        const result = await analysisService.getMacroSummary();
        res.json(result);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
