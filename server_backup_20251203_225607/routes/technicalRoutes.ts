import express from 'express';
import technicalAnalysis from '../services/technicalAnalysis.js';
import { generateSignals, generateRecommendation } from '../utils/technicalUtils.js';

const router = express.Router();

/**
 * GET /api/technical/indicators/:ticker
 */
router.get('/indicators/:ticker', async (req, res) => {
    try {
        const ticker = req.params.ticker.toUpperCase();
        const indicators = await technicalAnalysis.calculateIndicators(ticker);

        res.json({
            ticker,
            indicators
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/technical/patterns/:ticker
 */
router.get('/patterns/:ticker', async (req, res) => {
    try {
        const ticker = req.params.ticker.toUpperCase();
        const patternData = await technicalAnalysis.detectPatterns(ticker);

        res.json({
            ticker,
            trend: patternData.trend,
            patterns: patternData.patterns,
            patternsFound: patternData.patterns.length
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/technical/full/:ticker
 * Combines indicators + patterns + signals
 */
router.get('/full/:ticker', async (req, res) => {
    try {
        const ticker = req.params.ticker.toUpperCase();

        const indicators = await technicalAnalysis.calculateIndicators(ticker);
        const patternData = await technicalAnalysis.detectPatterns(ticker);

        const signalList = generateSignals(indicators, patternData.patterns);
        const recommendation = generateRecommendation(indicators, patternData.patterns);

        res.json({
            ticker,
            indicators,
            trend: patternData.trend,
            patterns: patternData.patterns,
            signals: signalList,
            recommendation
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
