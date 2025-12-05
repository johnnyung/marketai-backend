import express from 'express';
import fmpService from '../services/fmpService.js';

const router = express.Router();

router.get('/fmp/:ticker', async (req, res) => {
    try {
        const { ticker } = req.params;
        
        // Trigger a request to populate internal debug state
        const price = await fmpService.getPrice(ticker);
        
        // Access the Phase 36 diagnostic state
        const debugInfo = fmpService.lastDebug || {};

        res.json({
            status: price ? 'OK' : 'FAIL',
            ticker,
            price,
            debug: debugInfo
        });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
