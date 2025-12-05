import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import unifiedIntelligenceFactory from '../services/unifiedIntelligenceFactory.js';
import { adaptForTopPicks } from '../utils/uiResponseAdapter.js';

const router = express.Router();

/**
 * CONTROLLER LOGIC
 * Encapsulated to ensure consistent error handling and response shaping.
 */
const getTopPicks = async (req: any, res: any) => {
    try {
        console.log(`[API] ${req.method} /api/ai-tips/top3 requested by User ${req.user?.userId || 'Anon'}`);
        
        // 1. Generate Intelligence (Real Data + Synthetic Polyfills)
        const bundles = await unifiedIntelligenceFactory.generateTopPicks();
        
        if (!bundles || bundles.length === 0) {
            console.warn('[API] No bundles generated.');
            return res.status(500).json({ error: 'Intelligence Generation Failed', fallback: [] });
        }

        // 2. Adapt for UI (Flattened Card Structure)
        const response = bundles.map(b => adaptForTopPicks(b));
        
        // 3. Send JSON
        res.json(response);

    } catch (e: any) {
        console.error('[API] Critical Error in Top Picks:', e.message);
        res.status(500).json({ error: 'Internal Server Error', details: e.message });
    }
};

// --- ROUTE DEFINITIONS ---

// Primary Endpoint
router.get('/top3', authenticateToken, getTopPicks);

// Aliases for Frontend Compatibility
router.get('/active', authenticateToken, getTopPicks);
router.post('/generate', authenticateToken, getTopPicks);

// Root /api/ai-tips redirect
router.get('/', authenticateToken, getTopPicks);

export default router;
