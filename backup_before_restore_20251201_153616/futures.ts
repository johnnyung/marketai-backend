import express from 'express';
import futuresService from '../services/futures.js';

const router = express.Router();

/**
 * GET /api/futures/contracts
 * Returns supported futures contracts & prices
 */
router.get('/contracts', async (_req, res) => {
    try {
        const list = await futuresService.getAllContracts();
        res.json({ success: true, contracts: list });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

/**
 * GET /api/futures/specs/:symbol
 * Returns contract specs (price, name, etc.)
 */
router.get('/specs/:symbol', async (req, res) => {
    try {
        const specs = await futuresService.getContractSpecs(req.params.symbol);
        res.json({ success: true, specs });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
