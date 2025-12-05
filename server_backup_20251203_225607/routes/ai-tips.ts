import express from 'express';
import aiTipsRouter from './ai-tips.js';

const router = express.Router();

// PATCH: route alias for old frontend URLs
// Forwards legacy endpoints to the main router
router.get('/active', (req, res, next) => {
    req.url = "/active";
    // @ts-ignore - express router type compatibility
    return aiTipsRouter(req, res, next);
});

router.post('/generate', (req, res, next) => {
    req.url = "/generate";
    // @ts-ignore - express router type compatibility
    return aiTipsRouter(req, res, next);
});

// Forward all other requests
router.use('/', aiTipsRouter);

export default router;
