// src/routes/cryptoCorrelationRoutes.ts
// API Routes for Crypto-Stock Correlation Tracker

import express from 'express';
import cryptoStockCorrelationService from '../services/cryptoStockCorrelation.js';
import { pool } from '../db/index.js';

const router = express.Router();

// Get correlation tracking status
router.get('/status', async (req, res) => {
  try {
    const status = await cryptoStockCorrelationService.getCorrelationStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get latest prediction
router.get('/prediction/latest', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        prediction_date,
        crypto_weekend_change,
        predicted_direction,
        confidence_score,
        high_correlation_tickers,
        actual_market_change,
        prediction_correct,
        ticker_accuracy,
        status,
        validated_at
      FROM crypto_stock_predictions
      ORDER BY prediction_date DESC
      LIMIT 1
    `);

    res.json({
      success: true,
      data: result.rows[0] || null
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get prediction history
router.get('/predictions', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    const result = await pool.query(`
      SELECT 
        id,
        prediction_date,
        crypto_weekend_change,
        predicted_direction,
        confidence_score,
        high_correlation_tickers,
        actual_market_change,
        prediction_correct,
        ticker_accuracy,
        status,
        validated_at
      FROM crypto_stock_predictions
      ORDER BY prediction_date DESC
      LIMIT $1
    `, [limit]);

    // Calculate overall stats
    const validated = result.rows.filter(p => p.status === 'validated');
    const correct = validated.filter(p => p.prediction_correct);
    
    const stats = {
      total_predictions: result.rows.length,
      validated_predictions: validated.length,
      correct_predictions: correct.length,
      accuracy_rate: validated.length > 0 ? (correct.length / validated.length * 100).toFixed(1) : 0,
      average_confidence: (
        result.rows.reduce((sum, p) => sum + (p.confidence_score || 0), 0) / result.rows.length
      ).toFixed(1)
    };

    res.json({
      success: true,
      data: {
        predictions: result.rows,
        stats
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get crypto prices (24/7 data)
router.get('/crypto/prices', async (req, res) => {
  try {
    const { symbol, hours = 24 } = req.query;
    
    let query = `
      SELECT 
        symbol,
        name,
        price,
        change_24h,
        change_7d,
        market_cap,
        volume_24h,
        market_phase,
        is_market_hours,
        timestamp
      FROM crypto_prices_24_7
      WHERE timestamp > NOW() - INTERVAL '${hours} hours'
    `;
    
    if (symbol) {
      query += ` AND symbol = '${symbol}'`;
    }
    
    query += ' ORDER BY timestamp DESC';
    
    const result = await pool.query(query);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get weekend crypto movement analysis
router.get('/crypto/weekend-analysis', async (req, res) => {
  try {
    const query = `
      WITH friday_close AS (
        SELECT symbol, price, timestamp,
        ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY timestamp DESC) as rn
        FROM crypto_prices_24_7
        WHERE EXTRACT(DOW FROM timestamp) = 5
        AND EXTRACT(HOUR FROM timestamp) >= 16
        AND timestamp > NOW() - INTERVAL '7 days'
      ),
      monday_open AS (
        SELECT symbol, price, timestamp,
        ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY timestamp ASC) as rn
        FROM crypto_prices_24_7
        WHERE EXTRACT(DOW FROM timestamp) = 1
        AND EXTRACT(HOUR FROM timestamp) <= 9
        AND timestamp > NOW() - INTERVAL '3 days'
      )
      SELECT 
        fc.symbol,
        fc.price as friday_price,
        mo.price as monday_price,
        ((mo.price - fc.price) / fc.price * 100) as weekend_change,
        fc.timestamp as friday_time,
        mo.timestamp as monday_time
      FROM friday_close fc
      JOIN monday_open mo ON fc.symbol = mo.symbol AND fc.rn = 1 AND mo.rn = 1
      ORDER BY ABS((mo.price - fc.price) / fc.price * 100) DESC
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get high correlation tickers
router.get('/tickers/high-correlation', async (req, res) => {
  try {
    // Get latest prediction's high correlation tickers
    const result = await pool.query(`
      SELECT high_correlation_tickers
      FROM crypto_stock_predictions
      WHERE high_correlation_tickers IS NOT NULL
      ORDER BY prediction_date DESC
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        data: []
      });
    }

    const tickers = result.rows[0].high_correlation_tickers;

    res.json({
      success: true,
      data: tickers
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Manual trigger: Generate prediction
router.post('/prediction/generate', async (req, res) => {
  try {
    const prediction = await cryptoStockCorrelationService.generatePrediction();
    
    if (!prediction) {
      return res.status(400).json({
        success: false,
        error: 'Unable to generate prediction - insufficient data'
      });
    }

    res.json({
      success: true,
      data: prediction,
      message: 'Prediction generated successfully'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Manual trigger: Validate prediction
router.post('/prediction/validate', async (req, res) => {
  try {
    await cryptoStockCorrelationService.validatePrediction();
    
    res.json({
      success: true,
      message: 'Prediction validation complete'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Manual trigger: Collect crypto prices
router.post('/crypto/collect', async (req, res) => {
  try {
    await cryptoStockCorrelationService.collectCryptoPrices();
    
    res.json({
      success: true,
      message: 'Crypto prices collected'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get correlation analytics
router.get('/analytics', async (req, res) => {
  try {
    // Get prediction accuracy over time
    const accuracyOverTime = await pool.query(`
      SELECT 
        DATE(prediction_date) as date,
        COUNT(*) as total,
        SUM(CASE WHEN prediction_correct THEN 1 ELSE 0 END) as correct,
        AVG(confidence_score) as avg_confidence,
        AVG(ticker_accuracy) as avg_ticker_accuracy
      FROM crypto_stock_predictions
      WHERE status = 'validated'
      GROUP BY DATE(prediction_date)
      ORDER BY date DESC
      LIMIT 30
    `);

    // Get best performing tickers
    const bestTickers = await pool.query(`
      SELECT 
        ticker_data->>'ticker' as ticker,
        ticker_data->>'name' as name,
        AVG((ticker_data->>'correlation_score')::float) as avg_correlation,
        AVG((ticker_data->>'historical_accuracy')::float) as avg_accuracy,
        COUNT(*) as appearances
      FROM crypto_stock_predictions,
      jsonb_array_elements(high_correlation_tickers) as ticker_data
      WHERE status = 'validated'
      GROUP BY ticker, name
      ORDER BY avg_accuracy DESC
      LIMIT 20
    `);

    // Get performance by prediction direction
    const directionPerformance = await pool.query(`
      SELECT 
        predicted_direction,
        COUNT(*) as total,
        SUM(CASE WHEN prediction_correct THEN 1 ELSE 0 END) as correct,
        AVG(confidence_score) as avg_confidence
      FROM crypto_stock_predictions
      WHERE status = 'validated'
      GROUP BY predicted_direction
      ORDER BY predicted_direction
    `);

    res.json({
      success: true,
      data: {
        accuracy_over_time: accuracyOverTime.rows,
        best_tickers: bestTickers.rows,
        direction_performance: directionPerformance.rows
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
