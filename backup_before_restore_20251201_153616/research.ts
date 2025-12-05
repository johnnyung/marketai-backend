import { Router } from 'express';
import { db } from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

/**
 * Get all research items for user
 */
router.get('/items', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId;

    const result = await db.query(`
      SELECT id, type, title, content, url, ticker, tags, importance, created_at
      FROM user_research
      WHERE user_id = $1
      ORDER BY created_at DESC
    `, [userId]);

    res.json(result.rows);
  } catch (error: any) {
    console.error('Failed to fetch research items:', error);
    res.status(500).json({ error: 'Failed to fetch research items' });
  }
});

/**
 * Create new research item
 */
router.post('/items', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { type, title, content, url, ticker, tags, importance } = req.body;

    const result = await db.query(`
      INSERT INTO user_research (user_id, type, title, content, url, ticker, tags, importance)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [userId, type, title, content, url || null, ticker || null, tags || [], importance]);

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Failed to create research item:', error);
    res.status(500).json({ error: 'Failed to create research item' });
  }
});

/**
 * Delete research item
 */
router.delete('/items/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    await db.query(`
      DELETE FROM user_research
      WHERE id = $1 AND user_id = $2
    `, [id, userId]);

    res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete research item:', error);
    res.status(500).json({ error: 'Failed to delete research item' });
  }
});

export default router;
