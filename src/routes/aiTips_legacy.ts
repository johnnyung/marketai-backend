import express from 'express';
import aiTipsRouter from './ai-tips.js';

const router = express.Router();

// PATCH: route alias for old frontend URLs
router.get('/active', (req, res, next) => {
    req.url = "/active";
    return aiTipsRouter(req, res, next);
});

router.post('/generate', (req, res, next) => {
    req.url = "/generate";
    return aiTipsRouter(req, res, next);
});

export default router;
