// src/routes/technicalRoutes.ts
// API routes for technical analysis - FIXED

import express from 'express';
import technicalAnalysis from '../services/technicalAnalysis.js';

const router = express.Router();

// GET /api/technical/indicators/:ticker
router.get('/indicators/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const indicators = await technicalAnalysis.calculateIndicators(ticker);
    
    if (!indicators) {
      return res.json({
        success: false,
        error: 'Not enough data for technical analysis',
        data: {
          ticker,
          rsi: 50,
          macd: { macd: 0, signal: 0, histogram: 0 },
          movingAverages: { sma20: 0, sma50: 0, sma200: 0, ema12: 0, ema26: 0 },
          bollingerBands: { upper: 0, middle: 0, lower: 0 },
          stochastic: { k: 50, d: 50 },
          atr: 0,
          volume: { average: 0, ratio: 1 }
        }
      });
    }
    
    res.json({
      success: true,
      data: {
        ticker,
        ...indicators,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Indicators error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate indicators'
    });
  }
});

// GET /api/technical/patterns/:ticker
router.get('/patterns/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    const patterns = await technicalAnalysis.detectPatterns(ticker);
    
    res.json({
      success: true,
      data: {
        ticker,
        patterns,
        patternsFound: patterns.patterns.length,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Patterns error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to detect patterns'
    });
  }
});

// GET /api/technical/correlations
router.get('/correlations', async (req, res) => {
  try {
    const correlations = await technicalAnalysis.calculateCorrelations();
    
    res.json({
      success: true,
      data: {
        matrix: correlations,
        timestamp: new Date()
      }
    });
  } catch (error) {
    console.error('Correlations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate correlations'
    });
  }
});

// GET /api/technical/analysis/:ticker
router.get('/analysis/:ticker', async (req, res) => {
  try {
    const { ticker } = req.params;
    
    // Get both indicators and patterns
    const [indicators, patterns] = await Promise.all([
      technicalAnalysis.calculateIndicators(ticker),
      technicalAnalysis.detectPatterns(ticker)
    ]);
    
    // Generate analysis summary
    const analysis = {
      ticker,
      indicators: indicators || {},
      patterns: patterns || [],
      signals: generateSignals(indicators, patterns.patterns),
      recommendation: generateRecommendation(indicators, patterns.patterns),
      strength: calculateStrength(indicators),
      timestamp: new Date()
    };
    
    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate analysis'
    });
  }
});

// Helper functions
function generateSignals(indicators: any, patterns: any[]): string[] {
  const signals: string[] = []; // Fixed: Explicitly typed
  
  if (!indicators) return signals;
  
  // RSI signals
  if (indicators.rsi < 30) {
    signals.push('RSI Oversold - Potential Buy Signal');
  } else if (indicators.rsi > 70) {
    signals.push('RSI Overbought - Potential Sell Signal');
  }
  
  // MACD signals
  if (indicators.macd && indicators.macd.histogram > 0) {
    signals.push('MACD Bullish - Upward Momentum');
  } else if (indicators.macd && indicators.macd.histogram < 0) {
    signals.push('MACD Bearish - Downward Momentum');
  }
  
  // Moving average signals
  if (indicators.movingAverages) {
    if (indicators.movingAverages.sma20 > indicators.movingAverages.sma50) {
      signals.push('Short-term MA above Mid-term MA - Bullish');
    }
    if (indicators.movingAverages.sma50 > indicators.movingAverages.sma200) {
      signals.push('Golden Cross - Strong Bullish Signal');
    }
  }
  
  // Stochastic signals
  if (indicators.stochastic) {
    if (indicators.stochastic.k < 20) {
      signals.push('Stochastic Oversold');
    } else if (indicators.stochastic.k > 80) {
      signals.push('Stochastic Overbought');
    }
  }
  
  // Volume signals
  if (indicators.volume && indicators.volume.ratio > 1.5) {
    signals.push(`High Volume - ${indicators.volume.ratio}x average`);
  }
  
  // Pattern signals
  if (patterns && patterns.patterns.length > 0) {
    patterns.forEach(pattern => {
      if (pattern.confidence > 70) {
        signals.push(`${pattern.name} Pattern Detected`);
      }
    });
  }
  
  return signals;
}

function generateRecommendation(indicators: any, patterns: any[]): string {
  if (!indicators) return 'HOLD - Insufficient data';
  
  let bullishSignals = 0;
  let bearishSignals = 0;
  
  // Count signals
  if (indicators.rsi < 30) bullishSignals++;
  if (indicators.rsi > 70) bearishSignals++;
  
  if (indicators.macd?.histogram > 0) bullishSignals++;
  if (indicators.macd?.histogram < 0) bearishSignals++;
  
  if (indicators.stochastic?.k < 20) bullishSignals++;
  if (indicators.stochastic?.k > 80) bearishSignals++;
  
  // Check patterns
  if (patterns) {
    patterns.forEach(pattern => {
      if (pattern.type === 'bullish' && pattern.confidence > 60) bullishSignals++;
      if (pattern.type === 'bearish' && pattern.confidence > 60) bearishSignals++;
    });
  }
  
  if (bullishSignals > bearishSignals + 1) {
    return 'BUY - Multiple bullish signals';
  } else if (bearishSignals > bullishSignals + 1) {
    return 'SELL - Multiple bearish signals';
  } else {
    return 'HOLD - Mixed signals';
  }
}

function calculateStrength(indicators: any): number {
  if (!indicators) return 50;
  
  let strength = 50; // Neutral baseline
  
  // RSI contribution
  if (indicators.rsi < 30) strength += 15;
  else if (indicators.rsi > 70) strength -= 15;
  else strength += (50 - Math.abs(50 - indicators.rsi)) / 5;
  
  // MACD contribution
  if (indicators.macd) {
    if (indicators.macd.histogram > 0) strength += 10;
    else strength -= 10;
  }
  
  // Moving average contribution
  if (indicators.movingAverages) {
    if (indicators.movingAverages.sma20 > indicators.movingAverages.sma50) strength += 10;
    if (indicators.movingAverages.sma50 > indicators.movingAverages.sma200) strength += 10;
  }
  
  // Volume contribution
  if (indicators.volume && indicators.volume.ratio > 1) {
    strength += Math.min(10, indicators.volume.ratio * 5);
  }
  
  return Math.max(0, Math.min(100, strength));
}

export default router;
