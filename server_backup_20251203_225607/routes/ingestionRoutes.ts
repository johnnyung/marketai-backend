import express from 'express';
import newsService from '../services/ingestion/newsIngestionService.js';
import insiderService from '../services/ingestion/insiderIngestionService.js';
import economicService from '../services/ingestion/economicIngestionService.js';
import institutionalService from '../services/ingestion/institutionalIngestionService.js';
import optionsService from '../services/ingestion/optionsIngestionService.js';
// Stubs
import secService from '../services/ingestion/secIngestionService.js';
import congressService from '../services/ingestion/congressIngestionService.js';
import historicalService from '../services/ingestion/historicalIngestionService.js';

import redditService from '../services/ingestion/redditIngestionService.js';
import twitterService from '../services/ingestion/twitterIngestionService.js';
import youtubeService from '../services/ingestion/youtubeIngestionService.js';
import fedService from '../services/ingestion/fedIngestionService.js';
import whaleService from '../services/ingestion/whaleIngestionService.js';
import trendsService from '../services/ingestion/trendsIngestionService.js';

const router = express.Router();

// Helper wrapper
const runIngest = async (res: any, service: any, name: string) => {
    try {
        console.log(`[INGEST] Triggering ${name}...`);
        const result = await service.run();
        res.json(result);
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
};

// Routes
router.post('/news', (req, res) => runIngest(res, newsService, 'News'));
router.post('/insider', (req, res) => runIngest(res, insiderService, 'Insider'));
router.post('/economic', (req, res) => runIngest(res, economicService, 'Economic'));
router.post('/institutional', (req, res) => runIngest(res, institutionalService, 'Institutional'));
router.post('/options', (req, res) => runIngest(res, optionsService, 'Options'));

router.post('/sec', (req, res) => runIngest(res, secService, 'SEC'));
router.post('/congress', (req, res) => runIngest(res, congressService, 'Congress'));
router.post('/reddit', (req, res) => runIngest(res, redditService, 'Reddit'));
router.post('/twitter', (req, res) => runIngest(res, twitterService, 'Twitter'));
router.post('/youtube', (req, res) => runIngest(res, youtubeService, 'YouTube'));
router.post('/fed', (req, res) => runIngest(res, fedService, 'FED'));
router.post('/crypto-whales', (req, res) => runIngest(res, whaleService, 'Whales'));
router.post('/google-trends', (req, res) => runIngest(res, trendsService, 'Trends'));
router.post('/historical', (req, res) => runIngest(res, historicalService, 'Historical Events'));


// Run All
router.post('/run-all', async (req, res) => {
    const results = await Promise.all([
        newsService.run(),
        insiderService.run(),
        economicService.run()
    ]);
    res.json({
        success: true,
        timestamp: new Date().toISOString(),
        summary: results
    });
});

export default router;
