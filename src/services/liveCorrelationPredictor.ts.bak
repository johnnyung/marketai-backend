// src/services/liveCorrelationPredictor.ts
// Makes real-time predictions and validates them Monday morning

import { pool } from '../db/index.js';
import axios from 'axios';

class LiveCorrelationPredictor {
  
  /**
   * Check crypto weekend moves and make Monday predictions
   */
  async checkWeekendAndPredict() {
    console.log('🔮 Checking weekend crypto moves for Monday predictions...');
    
    const now = new Date();
    const dayOfWeek = now.getDay();
    
    // Only run Saturday-Monday
    if (dayOfWeek < 6 && dayOfWeek > 1) {
      console.log('   Not weekend/Monday - skipping');
      return;
    }
    
    // Get active patterns
    const patterns = await pool.query(`
      SELECT * FROM correlation_patterns
      WHERE is_active = true
      AND accuracy_rate >= 65
      AND pattern_type = 'weekend_crypto_to_monday_open'
      ORDER BY accuracy_rate DESC
    `);
    
    console.log(`   Found ${patterns.rows.length} active patterns to check`);
    
    for (const pattern of patterns.rows) {
      await this.makePrediction(pattern);
    }
  }
  
  /**
   * Make prediction based on pattern
   */
  private async makePrediction(pattern: any) {
    const { crypto_symbol, stock_symbol, correlation_strength, accuracy_rate } = pattern;
    
    // Get Friday close and current crypto price
    const cryptoMove = await this.getCryptoWeekendMove(crypto_symbol);
    
    if (!cryptoMove) {
      console.log(`   ⚠️  No crypto move detected for ${crypto_symbol}`);
      return;
    }
    
    // Calculate predicted stock move based on correlation
    const predictedStockMove = cryptoMove.percentChange * (pattern.stock_response_percent / pattern.crypto_move_percent);
    
    const prediction = {
      cryptoSymbol: crypto_symbol,
      cryptoMovePercent: cryptoMove.percentChange,
      stockSymbol: stock_symbol,
      predictedDirection: predictedStockMove > 0 ? 'up' : 'down',
      predictedMagnitude: Math.abs(predictedStockMove),
      confidence: accuracy_rate,
      patternId: pattern.id
    };
    
    // Store prediction
    await pool.query(`
      INSERT INTO correlation_predictions
      (pattern_id, crypto_symbol, crypto_move_percent, trigger_timestamp,
       predicted_stock, predicted_direction, predicted_magnitude, predicted_by, confidence, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, 'pending')
    `, [
      prediction.patternId,
      prediction.cryptoSymbol,
      prediction.cryptoMovePercent,
      cryptoMove.timestamp,
      prediction.stockSymbol,
      prediction.predictedDirection,
      prediction.predictedMagnitude,
      prediction.confidence
    ]);
    
    console.log(`   ✅ Prediction: ${crypto_symbol} ${cryptoMove.percentChange > 0 ? '+' : ''}${cryptoMove.percentChange.toFixed(2)}% → ${stock_symbol} ${prediction.predictedDirection} ${prediction.predictedMagnitude.toFixed(2)}% (${prediction.confidence}% confidence)`);
  }
  
  /**
   * Get crypto weekend move (Friday close to Sunday close)
   */
  private async getCryptoWeekendMove(symbol: string) {
    try {
      // Get Friday 4pm price
      const fridayClose = await pool.query(`
        SELECT price, timestamp
        FROM crypto_historical_prices
        WHERE symbol = $1
        AND day_of_week = 5
        AND hour_of_day >= 16
        ORDER BY timestamp DESC
        LIMIT 1
      `, [symbol]);
      
      if (fridayClose.rows.length === 0) return null;
      
      // Get current price (or Sunday close if already Monday)
      const currentPrice = await this.getCurrentCryptoPrice(symbol);
      
      if (!currentPrice) return null;
      
      const percentChange = ((currentPrice - fridayClose.rows[0].price) / fridayClose.rows[0].price) * 100;
      
      return {
        percentChange,
        fridayClose: fridayClose.rows[0].price,
        currentPrice,
        timestamp: new Date()
      };
      
    } catch (error) {
      console.error(`Error getting weekend move for ${symbol}:`, error);
      return null;
    }
  }
  
  /**
   * Get current crypto price (CoinGecko)
   */
  private async getCurrentCryptoPrice(symbol: string) {
    try {
      const coinId = this.getCoinGeckoId(symbol);
      const url = `https://api.coingecko.com/stable/simple/price?ids=${coinId}&vs_currencies=usd`;
      
      const response = await axios.get(url);
      return response.data[coinId]?.usd || null;
      
    } catch (error) {
      console.error(`Failed to get current price for ${symbol}:`, error);
      return null;
    }
  }
  
  /**
   * Validate predictions Monday after market open
   */
  async validateMondayPredictions() {
    console.log('✅ Validating Monday predictions...');
    
    const now = new Date();
    const dayOfWeek = now.getDay();
    const hour = now.getHours();
    
    // Only run Monday after 10:30am ET (market settled)
    if (dayOfWeek !== 1 || hour < 10) {
      console.log('   Not Monday morning - skipping validation');
      return;
    }
    
    // Get pending predictions from this weekend
    const predictions = await pool.query(`
      SELECT * FROM correlation_predictions
      WHERE status = 'pending'
      AND predicted_by >= NOW() - INTERVAL '3 days'
    `);
    
    console.log(`   Validating ${predictions.rows.length} predictions...`);
    
    for (const prediction of predictions.rows) {
      await this.validatePrediction(prediction);
    }
    
    // Update pattern performance
    await this.updatePatternPerformance();
  }
  
  /**
   * Validate single prediction
   */
  private async validatePrediction(prediction: any) {
    const { predicted_stock, predicted_direction, predicted_magnitude, id } = prediction;
    
    try {
      // Get actual Monday open
      const stockData = await this.getMondayOpen(predicted_stock);
      
      if (!stockData) {
        console.log(`   ⚠️  No Monday data for ${predicted_stock}`);
        return;
      }
      
      const actualMove = stockData.mondayGapPercent;
      const actualDirection = actualMove > 0 ? 'up' : 'down';
      
      const wasCorrect = actualDirection === predicted_direction;
      const accuracy = wasCorrect ? 
        100 - Math.abs(((predicted_magnitude - Math.abs(actualMove)) / Math.abs(actualMove)) * 100) : 0;
      
      // Update prediction
      await pool.query(`
        UPDATE correlation_predictions
        SET actual_stock_move = $1,
            prediction_accuracy = $2,
            was_correct = $3,
            validated_at = NOW(),
            status = 'validated'
        WHERE id = $4
      `, [actualMove, accuracy, wasCorrect, id]);
      
      console.log(`   ${wasCorrect ? '✅' : '❌'} ${predicted_stock}: Predicted ${predicted_direction} ${predicted_magnitude.toFixed(2)}%, Actual ${actualMove > 0 ? '+' : ''}${actualMove.toFixed(2)}%`);
      
    } catch (error) {
      console.error(`Validation error for prediction ${id}:`, error);
      
      await pool.query(`
        UPDATE correlation_predictions
        SET status = 'failed'
        WHERE id = $1
      `, [id]);
    }
  }
  
  /**
   * Get Monday open data
   */
  private async getMondayOpen(symbol: string) {
    // Check if we have today's data
    const today = new Date().toISOString().split('T')[0];
    
    const result = await pool.query(`
      SELECT 
        open_price,
        previous_friday_close,
        ((open_price - previous_friday_close) / previous_friday_close * 100) as monday_gap_percent
      FROM stock_historical_prices
      WHERE symbol = $1
      AND date = $2
      AND is_monday_open = true
    `, [symbol, today]);
    
    return result.rows[0] || null;
  }
  
  /**
   * Update pattern performance based on recent validations
   */
  private async updatePatternPerformance() {
    console.log('📊 Updating pattern performance metrics...');
    
    const patterns = await pool.query(`
      SELECT DISTINCT pattern_id FROM correlation_predictions
      WHERE validated_at >= NOW() - INTERVAL '7 days'
    `);
    
    for (const { pattern_id } of patterns.rows) {
      // Get recent performance
      const stats = await pool.query(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN was_correct THEN 1 ELSE 0 END) as correct,
          AVG(prediction_accuracy) as avg_accuracy
        FROM correlation_predictions
        WHERE pattern_id = $1
        AND validated_at >= NOW() - INTERVAL '30 days'
      `, [pattern_id]);
      
      const { total, correct, avg_accuracy } = stats.rows[0];
      const accuracyRate = (correct / total) * 100;
      
      // Update pattern
      await pool.query(`
        UPDATE correlation_patterns
        SET accuracy_rate = $1,
            last_validated = NOW()
        WHERE id = $2
      `, [accuracyRate, pattern_id]);
      
      console.log(`   Pattern ${pattern_id}: ${accuracyRate.toFixed(1)}% accuracy (${correct}/${total} correct)`);
    }
  }
  
  /**
   * Map symbol to CoinGecko ID
   */
  private getCoinGeckoId(symbol: string): string {
    const map: Record<string, string> = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'SOL': 'solana'
    };
    return map[symbol] || symbol.toLowerCase();
  }
  
  /**
   * Start live monitoring
   */
  startMonitoring() {
    console.log('🚀 Live Correlation Predictor started');
    
    // Check weekend moves every 4 hours
    setInterval(() => this.checkWeekendAndPredict(), 4 * 60 * 60 * 1000);
    
    // Validate predictions every hour on Monday
    setInterval(() => this.validateMondayPredictions(), 60 * 60 * 1000);
    
    // Initial run
    this.checkWeekendAndPredict();
  }
}

export default new LiveCorrelationPredictor();
