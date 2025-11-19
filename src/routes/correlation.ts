// src/routes/correlation.ts
import express from 'express';
import pool from '../db/index.js';
import aiPatternDetectionEngine from '../services/aiPatternDetectionEngine.js';
import liveCorrelationPredictor from '../services/liveCorrelationPredictor.js';

const router = express.Router();

// Run pattern detection
router.post('/detect-patterns', async (req, res) => {
  try {
    const patterns = await aiPatternDetectionEngine.detectWeekendPatterns();
    res.json({ success: true, message: `Detected ${patterns.length} patterns`, patterns });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get active patterns
router.get('/patterns', async (req, res) => {
  try {
    const minAccuracy = parseInt(req.query.minAccuracy as string) || 65;
    const patterns = await aiPatternDetectionEngine.getActivePatterns(minAccuracy);
    res.json({ success: true, data: patterns });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get predictions
router.get('/predictions', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, pat.pattern_description, pat.accuracy_rate as pattern_accuracy
      FROM correlation_predictions p
      JOIN correlation_patterns pat ON p.pattern_id = pat.id
      WHERE p.status = 'pending'
      ORDER BY p.predicted_by DESC
      LIMIT 20
    `);
    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get history
router.get('/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    
    const [history, stats] = await Promise.all([
      pool.query(`
        SELECT p.*, pat.pattern_description
        FROM correlation_predictions p
        JOIN correlation_patterns pat ON p.pattern_id = pat.id
        WHERE p.status = 'validated'
        ORDER BY p.validated_at DESC
        LIMIT $1
      `, [limit]),
      pool.query(`
        SELECT 
          COUNT(*) as total_validated,
          SUM(CASE WHEN was_correct THEN 1 ELSE 0 END) as correct,
          AVG(prediction_accuracy) as avg_accuracy
        FROM correlation_predictions
        WHERE status = 'validated'
      `)
    ]);
    
    res.json({ success: true, data: history.rows, stats: stats.rows[0] });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Dashboard data
router.get('/dashboard', async (req, res) => {
  try {
    const [patterns, predictions, performance] = await Promise.all([
      pool.query(`
        SELECT crypto_symbol, stock_symbol, accuracy_rate, sample_size, 
               correlation_strength, pattern_description
        FROM correlation_patterns
        WHERE is_active = true
        ORDER BY accuracy_rate DESC
        LIMIT 10
      `),
      pool.query(`
        SELECT COUNT(*) as pending_count
        FROM correlation_predictions
        WHERE status = 'pending'
      `),
      pool.query(`
        SELECT 
          COUNT(*) as total_validated,
          SUM(CASE WHEN was_correct THEN 1 ELSE 0 END) as correct,
          AVG(prediction_accuracy) as avg_accuracy
        FROM correlation_predictions
        WHERE status = 'validated'
        AND validated_at >= NOW() - INTERVAL '30 days'
      `)
    ]);
    
    res.json({
      success: true,
      data: {
        patterns: patterns.rows,
        pendingPredictions: predictions.rows[0].pending_count,
        performance: performance.rows[0]
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Manual triggers
router.post('/check-weekend', async (req, res) => {
  try {
    await liveCorrelationPredictor.checkWeekendAndPredict();
    res.json({ success: true, message: 'Weekend check complete' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/validate-monday', async (req, res) => {
  try {
    await liveCorrelationPredictor.validateMondayPredictions();
    res.json({ success: true, message: 'Monday validation complete' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
