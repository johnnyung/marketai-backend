import express from 'express';
import unifiedIntelligenceFactory from '../../services/unifiedIntelligenceFactory.js';

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    const picks = await unifiedIntelligenceFactory.generateTopPicks();
    res.json({ ok: true, picks });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

export default router;
