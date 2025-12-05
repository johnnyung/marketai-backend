import express from 'express';
const router = express.Router();

router.get('/env', (req, res) => {
    console.log('[DEBUG] Accessing Environment Variables Check');
    res.json({
        message: 'Environment Variable Diagnostic',
        timestamp: new Date().toISOString(),
        FMP_ENV_PRESENT: !!process.env.FMP_API_KEY,
        raw_key_start: process.env.FMP_API_KEY ? process.env.FMP_API_KEY.substring(0, 5) + '...' : 'NULL',
        node_env: process.env.NODE_ENV,
        keys_loaded: Object.keys(process.env).sort()
    });
});

export default router;
