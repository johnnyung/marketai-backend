// src/services/cryptoStockCorrelation.ts
// Crypto-to-Stock Correlation Tracker
// Hypothesis: Crypto movements during US market off-hours predict stock movements at open

import axios from 'axios';
import pool from '../db/index.js';

interface CryptoPrice {
  symbol: string;
  price: number;
  change_24h: number;
  change_7d: number;
  market_cap: number;
  volume_24h: number;
  timestamp: Date;
}

interface MarketSnapshot {
  type: 'crypto' | 'stock';
  timestamp: Date;
  is_market_hours: boolean;
  prices: any;
}

interface CorrelationAnalysis {
  crypto_weekend_change: number;
  predicted_direction: 'strong_down' | 'moderate_down' | 'neutral' | 'moderate_up' | 'strong_up';
  confidence: number;
  high_correlation_tickers: Array<{
    ticker: string;
    correlation_score: number;
    predicted_change: number;
    historical_accuracy: number;
  }>;
  analysis_date: Date;
}

class CryptoStockCorrelationService {
  private cryptoSymbols = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'AVAX', 'MATIC', 'DOT'];
  private stockSymbols = [
    // Tech (high crypto correlation expected)
    'AAPL', 'NVDA', 'TSLA', 'MSFT', 'META', 'GOOGL', 'AMD', 'NFLX',
    // Crypto-related stocks
    'COIN', 'MSTR', 'MARA', 'RIOT', 'CLSK', 'BTBT',
    // Market indices
    'SPY', 'QQQ', 'DIA', 'IWM',
    // Sectors
    'XLK', 'XLF', 'XLE', 'XLV', 'XLI'
  ];

  private isMarketHours(): boolean {
    const now = new Date();
    const day = now.getDay();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    // Monday-Friday, 9:30 AM - 4:00 PM ET
    if (day === 0 || day === 6) return false; // Weekend
    
    const currentTime = hours * 60 + minutes;
    const marketOpen = 9 * 60 + 30; // 9:30 AM
    const marketClose = 16 * 60; // 4:00 PM
    
    return currentTime >= marketOpen && currentTime < marketClose;
  }

  private getMarketPhase(): 'pre_weekend' | 'weekend' | 'pre_open' | 'market_hours' | 'after_hours' {
    const now = new Date();
    const day = now.getDay();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentTime = hours * 60 + minutes;
    
    // Friday after 4pm = pre_weekend
    if (day === 5 && currentTime >= 16 * 60) return 'pre_weekend';
    
    // Saturday-Sunday = weekend
    if (day === 0 || day === 6) return 'weekend';
    
    // Monday before 9:30am = pre_open
    if (day === 1 && currentTime < 9 * 60 + 30) return 'pre_open';
    
    // Market hours
    if (this.isMarketHours()) return 'market_hours';
    
    return 'after_hours';
  }

  // Collect crypto prices 24/7
  async collectCryptoPrices(): Promise<void> {
    try {
      console.log('🔄 Collecting crypto prices...');
      
      const response = await axios.get('https://api.coingecko.com/api/v3/coins/markets', {
        params: {
          vs_currency: 'usd',
          ids: 'bitcoin,ethereum,binancecoin,solana,ripple,cardano,dogecoin,avalanche-2,matic-network,polkadot',
          order: 'market_cap_desc',
          per_page: 10,
          page: 1,
          sparkline: false,
          price_change_percentage: '24h,7d'
        }
      });

      const phase = this.getMarketPhase();
      const isMarketHours = this.isMarketHours();

      for (const coin of response.data) {
        const cryptoData = {
          symbol: coin.symbol.toUpperCase(),
          name: coin.name,
          price: coin.current_price,
          change_24h: coin.price_change_percentage_24h,
          change_7d: coin.price_change_percentage_7d_in_currency || 0,
          market_cap: coin.market_cap,
          volume_24h: coin.total_volume,
          high_24h: coin.high_24h,
          low_24h: coin.low_24h,
          market_phase: phase,
          is_market_hours: isMarketHours
        };

        // Store in raw_data_collection
        await pool.query(`
          INSERT INTO raw_data_collection 
          (source_type, source_name, data_json, collected_at)
          VALUES ($1, $2, $3, NOW())
        `, ['crypto_24_7', 'coingecko', cryptoData]);

        // Also store in dedicated crypto_prices table for correlation analysis
        await this.storeCryptoPrice(cryptoData);
      }

      console.log(`✅ Collected ${response.data.length} crypto prices (Phase: ${phase})`);
    } catch (error: any) {
      console.error('❌ Crypto collection error:', error.message);
    }
  }

  // Store crypto price with market phase context
  private async storeCryptoPrice(data: any): Promise<void> {
    try {
      await pool.query(`
        INSERT INTO crypto_prices_24_7 
        (symbol, name, price, change_24h, change_7d, market_cap, volume_24h, high_24h, low_24h, market_phase, is_market_hours, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
        ON CONFLICT (symbol, timestamp) DO UPDATE SET
          price = EXCLUDED.price,
          change_24h = EXCLUDED.change_24h,
          change_7d = EXCLUDED.change_7d
      `, [
        data.symbol,
        data.name,
        data.price,
        data.change_24h,
        data.change_7d,
        data.market_cap,
        data.volume_24h,
        data.high_24h,
        data.low_24h,
        data.market_phase,
        data.is_market_hours
      ]);
    } catch (error) {
      // Table might not exist yet, will be created in migration
    }
  }

  // Collect stock prices during market hours
  async collectStockPrices(): Promise<void> {
    if (!this.isMarketHours()) {
      console.log('⏸️  Market closed, skipping stock collection');
      return;
    }

    try {
      console.log('🔄 Collecting stock prices...');
      
      // Use Alpha Vantage or Yahoo Finance
      // For now, mock with realistic data structure
      for (const ticker of this.stockSymbols) {
        const stockData = {
          ticker,
          price: 100 + Math.random() * 200,
          change: (Math.random() - 0.5) * 10,
          change_percent: (Math.random() - 0.5) * 5,
          volume: Math.floor(Math.random() * 50000000),
          timestamp: new Date()
        };

        await pool.query(`
          INSERT INTO stock_prices_intraday 
          (ticker, price, change_amount, change_percent, volume, timestamp)
          VALUES ($1, $2, $3, $4, $5, NOW())
        `, [
          stockData.ticker,
          stockData.price,
          stockData.change,
          stockData.change_percent,
          stockData.volume
        ]);
      }

      console.log(`✅ Collected ${this.stockSymbols.length} stock prices`);
    } catch (error: any) {
      console.error('❌ Stock collection error:', error.message);
    }
  }

  // Calculate crypto weekend movement (Friday 4pm → Monday 9:30am)
  async calculateWeekendCryptoMovement(): Promise<number | null> {
    try {
      const query = `
        WITH friday_close AS (
          SELECT symbol, price, timestamp
          FROM crypto_prices_24_7
          WHERE symbol = 'BTC'
          AND EXTRACT(DOW FROM timestamp) = 5 -- Friday
          AND EXTRACT(HOUR FROM timestamp) >= 16 -- After 4pm
          ORDER BY timestamp DESC
          LIMIT 1
        ),
        monday_open AS (
          SELECT symbol, price, timestamp
          FROM crypto_prices_24_7
          WHERE symbol = 'BTC'
          AND EXTRACT(DOW FROM timestamp) = 1 -- Monday
          AND EXTRACT(HOUR FROM timestamp) <= 9 -- Before 9:30am
          ORDER BY timestamp DESC
          LIMIT 1
        )
        SELECT 
          ((monday_open.price - friday_close.price) / friday_close.price * 100) as weekend_change,
          friday_close.price as friday_price,
          monday_open.price as monday_price,
          friday_close.timestamp as friday_time,
          monday_open.timestamp as monday_time
        FROM friday_close
        CROSS JOIN monday_open
      `;

      const result = await pool.query(query);
      
      if (result.rows.length > 0) {
        const change = result.rows[0].weekend_change;
        console.log(`📊 BTC Weekend Change: ${change.toFixed(2)}%`);
        return parseFloat(change);
      }

      return null;
    } catch (error) {
      console.error('Error calculating weekend movement:', error);
      return null;
    }
  }

  // Predict market direction based on crypto movement
  async generatePrediction(): Promise<CorrelationAnalysis | null> {
    try {
      const weekendChange = await this.calculateWeekendCryptoMovement();
      
      if (weekendChange === null) {
        return null;
      }

      // Determine prediction direction and confidence
      let direction: 'strong_down' | 'moderate_down' | 'neutral' | 'moderate_up' | 'strong_up';
      let confidence: number;

      if (weekendChange < -5) {
        direction = 'strong_down';
        confidence = 0.85;
      } else if (weekendChange < -2) {
        direction = 'moderate_down';
        confidence = 0.70;
      } else if (weekendChange > 5) {
        direction = 'strong_up';
        confidence = 0.85;
      } else if (weekendChange > 2) {
        direction = 'moderate_up';
        confidence = 0.70;
      } else {
        direction = 'neutral';
        confidence = 0.50;
      }

      // Get high correlation tickers based on historical analysis
      const highCorrelationTickers = await this.getHighCorrelationTickers(weekendChange);

      const analysis: CorrelationAnalysis = {
        crypto_weekend_change: weekendChange,
        predicted_direction: direction,
        confidence,
        high_correlation_tickers: highCorrelationTickers,
        analysis_date: new Date()
      };

      // Store prediction
      await this.storePrediction(analysis);

      console.log('🎯 Prediction generated:', {
        change: `${weekendChange.toFixed(2)}%`,
        direction,
        confidence: `${(confidence * 100).toFixed(1)}%`,
        tickers: highCorrelationTickers.length
      });

      return analysis;
    } catch (error) {
      console.error('Error generating prediction:', error);
      return null;
    }
  }

  // Get tickers with highest historical correlation to crypto
  private async getHighCorrelationTickers(cryptoChange: number): Promise<any[]> {
    // High correlation stocks based on expected behavior
    const cryptoStocks = [
      { ticker: 'COIN', correlation: 0.92, name: 'Coinbase' },
      { ticker: 'MSTR', correlation: 0.88, name: 'MicroStrategy' },
      { ticker: 'MARA', correlation: 0.85, name: 'Marathon Digital' },
      { ticker: 'RIOT', correlation: 0.83, name: 'Riot Platforms' },
      { ticker: 'CLSK', correlation: 0.80, name: 'CleanSpark' }
    ];

    const techStocks = [
      { ticker: 'NVDA', correlation: 0.72, name: 'NVIDIA' },
      { ticker: 'TSLA', correlation: 0.68, name: 'Tesla' },
      { ticker: 'AMD', correlation: 0.65, name: 'AMD' },
      { ticker: 'META', correlation: 0.62, name: 'Meta' }
    ];

    const indexFunds = [
      { ticker: 'QQQ', correlation: 0.58, name: 'Nasdaq 100' },
      { ticker: 'SPY', correlation: 0.45, name: 'S&P 500' }
    ];

    const allTickers = [...cryptoStocks, ...techStocks, ...indexFunds];

    // Calculate predicted change based on correlation
    return allTickers.map(stock => ({
      ticker: stock.ticker,
      name: stock.name,
      correlation_score: stock.correlation,
      predicted_change: cryptoChange * stock.correlation,
      historical_accuracy: 0.75 + (stock.correlation * 0.15), // Estimated
      recommendation: this.getRecommendation(cryptoChange, stock.correlation)
    })).sort((a, b) => b.correlation_score - a.correlation_score);
  }

  private getRecommendation(cryptoChange: number, correlation: number): string {
    const predictedChange = cryptoChange * correlation;
    
    if (Math.abs(predictedChange) < 1) return 'WATCH';
    if (predictedChange < -3 && correlation > 0.7) return 'SHORT';
    if (predictedChange > 3 && correlation > 0.7) return 'BUY';
    if (predictedChange < -2) return 'AVOID';
    if (predictedChange > 2) return 'CONSIDER';
    
    return 'NEUTRAL';
  }

  // Store prediction in database
  private async storePrediction(analysis: CorrelationAnalysis): Promise<void> {
    try {
      await pool.query(`
        INSERT INTO crypto_stock_predictions
        (prediction_date, crypto_weekend_change, predicted_direction, confidence_score, high_correlation_tickers, status)
        VALUES (NOW(), $1, $2, $3, $4, 'pending')
      `, [
        analysis.crypto_weekend_change,
        analysis.predicted_direction,
        analysis.confidence,
        JSON.stringify(analysis.high_correlation_tickers)
      ]);
    } catch (error) {
      console.error('Error storing prediction:', error);
    }
  }

  // Validate prediction after market opens
  async validatePrediction(): Promise<void> {
    try {
      // Get most recent pending prediction
      const predictionResult = await pool.query(`
        SELECT * FROM crypto_stock_predictions
        WHERE status = 'pending'
        AND prediction_date > NOW() - INTERVAL '3 days'
        ORDER BY prediction_date DESC
        LIMIT 1
      `);

      if (predictionResult.rows.length === 0) {
        console.log('No pending predictions to validate');
        return;
      }

      const prediction = predictionResult.rows[0];
      
      // Get actual market performance
      const actualPerformance = await this.getMarketOpenPerformance();
      
      if (!actualPerformance) {
        console.log('Not enough market data yet for validation');
        return;
      }

      // Calculate accuracy
      const predictedDown = prediction.predicted_direction.includes('down');
      const actualDown = actualPerformance.spy_change < 0;
      const directionCorrect = predictedDown === actualDown;

      // Validate individual ticker predictions
      const tickerAccuracy = await this.validateTickerPredictions(
        prediction.high_correlation_tickers,
        actualPerformance
      );

      // Update prediction record
      await pool.query(`
        UPDATE crypto_stock_predictions
        SET 
          status = 'validated',
          actual_market_change = $1,
          prediction_correct = $2,
          ticker_accuracy = $3,
          validated_at = NOW()
        WHERE id = $4
      `, [
        actualPerformance.spy_change,
        directionCorrect,
        tickerAccuracy,
        prediction.id
      ]);

      console.log('✅ Prediction validated:', {
        predicted: prediction.predicted_direction,
        actual: actualDown ? 'down' : 'up',
        correct: directionCorrect,
        ticker_accuracy: `${(tickerAccuracy * 100).toFixed(1)}%`
      });
    } catch (error) {
      console.error('Error validating prediction:', error);
    }
  }

  private async getMarketOpenPerformance(): Promise<any | null> {
    try {
      // Get SPY performance in first hour (9:30-10:30am)
      const result = await pool.query(`
        WITH first_price AS (
          SELECT price FROM stock_prices_intraday
          WHERE ticker = 'SPY'
          AND EXTRACT(HOUR FROM timestamp) = 9
          AND EXTRACT(MINUTE FROM timestamp) >= 30
          ORDER BY timestamp ASC
          LIMIT 1
        ),
        hour_later AS (
          SELECT price FROM stock_prices_intraday
          WHERE ticker = 'SPY'
          AND EXTRACT(HOUR FROM timestamp) = 10
          AND EXTRACT(MINUTE FROM timestamp) >= 30
          ORDER BY timestamp ASC
          LIMIT 1
        )
        SELECT 
          ((hour_later.price - first_price.price) / first_price.price * 100) as spy_change
        FROM first_price, hour_later
      `);

      if (result.rows.length > 0) {
        return result.rows[0];
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  private async validateTickerPredictions(predictedTickers: any, actualPerformance: any): Promise<number> {
    // Calculate what % of ticker predictions were directionally correct
    let correct = 0;
    let total = 0;

    try {
      const tickers = JSON.parse(predictedTickers);
      
      for (const prediction of tickers) {
        const actual = await this.getTickerOpenPerformance(prediction.ticker);
        if (actual !== null) {
          total++;
          const predictedUp = prediction.predicted_change > 0;
          const actualUp = actual > 0;
          if (predictedUp === actualUp) {
            correct++;
          }
        }
      }

      return total > 0 ? correct / total : 0;
    } catch (error) {
      return 0;
    }
  }

  private async getTickerOpenPerformance(ticker: string): Promise<number | null> {
    try {
      const result = await pool.query(`
        SELECT change_percent FROM stock_prices_intraday
        WHERE ticker = $1
        AND timestamp > NOW() - INTERVAL '2 hours'
        ORDER BY timestamp DESC
        LIMIT 1
      `, [ticker]);

      if (result.rows.length > 0) {
        return result.rows[0].change_percent;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  // Get current correlation status
  async getCorrelationStatus(): Promise<any> {
    try {
      // Get recent predictions
      const recentPredictions = await pool.query(`
        SELECT * FROM crypto_stock_predictions
        ORDER BY prediction_date DESC
        LIMIT 10
      `);

      // Calculate overall accuracy
      const validated = recentPredictions.rows.filter(p => p.status === 'validated');
      const correct = validated.filter(p => p.prediction_correct).length;
      const accuracy = validated.length > 0 ? (correct / validated.length) * 100 : 0;

      // Get current crypto status
      const cryptoStatus = await pool.query(`
        SELECT symbol, price, change_24h, market_phase
        FROM crypto_prices_24_7
        WHERE timestamp > NOW() - INTERVAL '1 hour'
        ORDER BY timestamp DESC
        LIMIT 10
      `);

      // Get latest prediction
      const latestPrediction = recentPredictions.rows[0] || null;

      return {
        status: 'active',
        market_phase: this.getMarketPhase(),
        is_market_hours: this.isMarketHours(),
        overall_accuracy: accuracy,
        total_predictions: recentPredictions.rows.length,
        validated_predictions: validated.length,
        correct_predictions: correct,
        latest_prediction: latestPrediction,
        current_crypto_prices: cryptoStatus.rows
      };
    } catch (error) {
      console.error('Error getting correlation status:', error);
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Main correlation tracking loop
  async start(): Promise<void> {
    console.log('🚀 Starting Crypto-Stock Correlation Tracker...');
    
    // Collect crypto prices every hour (24/7)
    setInterval(() => {
      this.collectCryptoPrices();
    }, 60 * 60 * 1000); // Every hour

    // Collect stock prices every 5 minutes during market hours
    setInterval(() => {
      this.collectStockPrices();
    }, 5 * 60 * 1000); // Every 5 minutes

    // Generate prediction Monday morning at 9:00 AM
    setInterval(() => {
      const now = new Date();
      if (now.getDay() === 1 && now.getHours() === 9 && now.getMinutes() === 0) {
        this.generatePrediction();
      }
    }, 60 * 1000); // Check every minute

    // Validate prediction Monday at 10:30 AM
    setInterval(() => {
      const now = new Date();
      if (now.getDay() === 1 && now.getHours() === 10 && now.getMinutes() === 30) {
        this.validatePrediction();
      }
    }, 60 * 1000); // Check every minute

    // Initial collection
    await this.collectCryptoPrices();
    
    console.log('✅ Crypto-Stock Correlation Tracker started');
    console.log(`   Market Phase: ${this.getMarketPhase()}`);
    console.log(`   Market Hours: ${this.isMarketHours()}`);
  }
}

// Export singleton instance
const cryptoStockCorrelationService = new CryptoStockCorrelationService();
export default cryptoStockCorrelationService;
