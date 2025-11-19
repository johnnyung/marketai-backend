// src/routes/correlationAnalysisRoutes.ts
// UPDATED: Batch collection to prevent memory overflow

import express from 'express';
import historicalDataFetcher from '../services/historicalDataFetcher.js';
import aiPatternDetectionEngine from '../services/aiPatternDetectionEngine.js';
import liveCorrelationPredictor from '../services/liveCorrelationPredictor.js';
import pool from '../db/index.js';

const router = express.Router();

/**
 * Fetch ONE symbol at a time (prevents memory overflow)
 * POST /api/correlation/fetch-symbol
 */
router.post('/fetch-symbol', async (req, res) => {
  const { symbol, type, years = 3 } = req.body;
  
  try {
    console.log(`📥 Fetching ${symbol} (${type})...`);
    
    let records = 0;
    if (type === 'crypto') {
      records = await historicalDataFetcher.fetchCryptoHistorical(symbol, years);
    } else {
      records = await historicalDataFetcher.fetchStockHistorical(symbol, years);
    }
    
    res.json({
      success: true,
      message: `${symbol} collected`,
      records
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get collection status
 * GET /api/correlation/collection-status
 */
router.get('/collection-status', async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(DISTINCT symbol) FROM crypto_historical_prices) as crypto_symbols,
        (SELECT COUNT(*) FROM crypto_historical_prices) as crypto_records,
        (SELECT COUNT(DISTINCT symbol) FROM stock_historical_prices) as stock_symbols,
        (SELECT COUNT(*) FROM stock_historical_prices) as stock_records,
        (SELECT MIN(timestamp) FROM crypto_historical_prices) as crypto_oldest,
        (SELECT MIN(date) FROM stock_historical_prices) as stock_oldest
    `);
    
    const needed = {
      cryptos: ['BTC', 'ETH', 'SOL'],
      stocks: ['SPY', 'QQQ', 'COIN', 'MSTR', 'TSLA', 'NVDA']
    };
    
    // Check what's already collected
    const cryptoCollected = await pool.query(`
      SELECT DISTINCT symbol FROM crypto_historical_prices
    `);
    
    const stockCollected = await pool.query(`
      SELECT DISTINCT symbol FROM stock_historical_prices
    `);
    
    const collected = {
      cryptos: cryptoCollected.rows.map(r => r.symbol),
      stocks: stockCollected.rows.map(r => r.symbol)
    };
    
    const remaining = {
      cryptos: needed.cryptos.filter(s => !collected.cryptos.includes(s)),
      stocks: needed.stocks.filter(s => !collected.stocks.includes(s))
    };
    
    res.json({
      success: true,
      data: {
        stats: stats.rows[0],
        collected,
        remaining,
        readyForAnalysis: remaining.cryptos.length === 0 && remaining.stocks.length === 0
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Run AI pattern detection
 */
router.post('/detect-patterns', async (req, res) => {
  try {
    console.log('🧠 Running AI pattern detection...');
    const patterns = await aiPatternDetectionEngine.detectWeekendPatterns();
    
    res.json({
      success: true,
      message: `Detected ${patterns.length} correlation patterns`,
      patterns
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get active patterns
 */
router.get('/patterns', async (req, res) => {
  try {
    const minAccuracy = parseInt(req.query.minAccuracy as string) || 65;
    const patterns = await aiPatternDetectionEngine.getActivePatterns(minAccuracy);
    
    res.json({ success: true, data: patterns });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get current predictions
 */
router.get('/predictions', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.*,
        pat.pattern_description,
        pat.accuracy_rate as pattern_accuracy
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

/**
 * Get prediction history with validation
 */
router.get('/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    
    const result = await pool.query(`
      SELECT 
        p.*,
        pat.pattern_description,
        pat.crypto_symbol || ' → ' || pat.stock_symbol as pair
      FROM correlation_predictions p
      JOIN correlation_patterns pat ON p.pattern_id = pat.id
      WHERE p.status = 'validated'
      ORDER BY p.validated_at DESC
      LIMIT $1
    `, [limit]);
    
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_predictions,
        SUM(CASE WHEN was_correct THEN 1 ELSE 0 END) as correct_predictions,
        AVG(prediction_accuracy) as avg_accuracy,
        COUNT(CASE WHEN validated_at >= NOW() - INTERVAL '7 days' THEN 1 END) as last_7_days
      FROM correlation_predictions
      WHERE status = 'validated'
    `);
    
    res.json({
      success: true,
      data: result.rows,
      stats: stats.rows[0]
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Manual prediction check
 */
router.post('/check-weekend', async (req, res) => {
  try {
    await liveCorrelationPredictor.checkWeekendAndPredict();
    res.json({ success: true, message: 'Weekend check complete' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Manual validation
 */
router.post('/validate-monday', async (req, res) => {
  try {
    await liveCorrelationPredictor.validateMondayPredictions();
    res.json({ success: true, message: 'Monday validation complete' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get correlation dashboard data
 */
router.get('/dashboard', async (req, res) => {
  try {
    const patterns = await pool.query(`
      SELECT 
        crypto_symbol,
        stock_symbol,
        accuracy_rate,
        sample_size,
        correlation_strength,
        pattern_description
      FROM correlation_patterns
      WHERE is_active = true
      ORDER BY accuracy_rate DESC
      LIMIT 10
    `);
    
    const predictions = await pool.query(`
      SELECT COUNT(*) as pending_count
      FROM correlation_predictions
      WHERE status = 'pending'
    `);
    
    const performance = await pool.query(`
      SELECT 
        COUNT(*) as total_validated,
        SUM(CASE WHEN was_correct THEN 1 ELSE 0 END) as correct,
        AVG(prediction_accuracy) as avg_accuracy
      FROM correlation_predictions
      WHERE status = 'validated'
      AND validated_at >= NOW() - INTERVAL '30 days'
    `);
    
    const dataStatus = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM crypto_historical_prices) as crypto_records,
        (SELECT COUNT(*) FROM stock_historical_prices) as stock_records,
        (SELECT MAX(timestamp) FROM crypto_historical_prices) as last_crypto_update,
        (SELECT MAX(date) FROM stock_historical_prices) as last_stock_update
    `);
    
    res.json({
      success: true,
      data: {
        patterns: patterns.rows,
        pendingPredictions: predictions.rows[0].pending_count,
        performance: performance.rows[0],
        dataStatus: dataStatus.rows[0]
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
