import express from 'express';
import portfolioIntelligenceEngine from '../services/portfolioIntelligenceEngine.js';

const router = express.Router();

// Analyze Portfolio (The "Big Red Button")
router.post('/analyze', async (req, res) => {
    try {
        // Hardcoded userId for single-user mode
        const userId = 1;
        const analysis = await portfolioIntelligenceEngine.analyzePortfolio(userId);
        res.json(analysis);
    } catch (error) {
        console.error('[API] Portfolio Analysis Failed:', error);
        res.status(500).json({ error: 'Analysis failed' });
    }
});

// Get Holdings
router.get('/', async (req, res) => {
    // Basic get logic handled by service in full implementation
    res.json({ message: 'Portfolio Service Online' });
});

export default router;
