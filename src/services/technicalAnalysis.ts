// src/services/technicalAnalysis.ts
// Advanced Technical Analysis Service

import pool from '../db/index.js';

interface OHLCV {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: Date;
}

interface TechnicalIndicators {
  rsi: number;
  macd: {
    macd: number;
    signal: number;
    histogram: number;
  };
  movingAverages: {
    sma20: number;
    sma50: number;
    sma200: number;
    ema12: number;
    ema26: number;
  };
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
  };
  stochastic: {
    k: number;
    d: number;
  };
  atr: number;
  volume: {
    average: number;
    ratio: number;
  };
}

interface Pattern {
  name: string;
  type: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  description: string;
  entryPoint?: number;
  stopLoss?: number;
  target?: number;
}

class TechnicalAnalysisService {
  
  // Calculate all technical indicators for a ticker
  async calculateIndicators(ticker: string): Promise<TechnicalIndicators | null> {
    try {
      // Get price history from database
      const result = await pool.query(`
        SELECT 
          data_json->>'price' as close,
          data_json->>'high24h' as high,
          data_json->>'low24h' as low,
          data_json->>'volume24h' as volume,
          collected_at
        FROM raw_data_collection
        WHERE UPPER(data_json->>'symbol') = UPPER($1)
          OR UPPER(data_json->>'ticker') = UPPER($1)
        ORDER BY collected_at DESC
        LIMIT 200
      `, [ticker]);
      
      if (result.rows.length < 20) {
        console.log(`Not enough data for ${ticker}`);
        return null;
      }
      
      const prices = result.rows.map(r => parseFloat(r.close || 0)).reverse();
      const highs = result.rows.map(r => parseFloat(r.high || r.close || 0)).reverse();
      const lows = result.rows.map(r => parseFloat(r.low || r.close || 0)).reverse();
      const volumes = result.rows.map(r => parseFloat(r.volume || 0)).reverse();
      
      // Calculate indicators
      const rsi = this.calculateRSI(prices, 14);
      const macd = this.calculateMACD(prices);
      const movingAverages = this.calculateMovingAverages(prices);
      const bollingerBands = this.calculateBollingerBands(prices, 20, 2);
      const stochastic = this.calculateStochastic(prices, highs, lows, 14);
      const atr = this.calculateATR(highs, lows, prices, 14);
      const volumeAnalysis = this.analyzeVolume(volumes);
      
      return {
        rsi,
        macd,
        movingAverages,
        bollingerBands,
        stochastic,
        atr,
        volume: volumeAnalysis
      };
    } catch (error) {
      console.error(`Error calculating indicators for ${ticker}:`, error);
      return null;
    }
  }
  
  // RSI Calculation
  private calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) return 50;
    
    let gains = 0;
    let losses = 0;
    
    // Calculate initial average gain/loss
    for (let i = prices.length - period; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) {
        gains += change;
      } else {
        losses -= change;
      }
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    
    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    
    return Math.round(rsi * 100) / 100;
  }
  
  // MACD Calculation
  private calculateMACD(prices: number[]) {
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    const macdLine = ema12 - ema26;
    
    // Signal line (9-day EMA of MACD)
    const macdValues = [];
    for (let i = 26; i < prices.length; i++) {
      const e12 = this.calculateEMA(prices.slice(0, i + 1), 12);
      const e26 = this.calculateEMA(prices.slice(0, i + 1), 26);
      macdValues.push(e12 - e26);
    }
    
    const signal = this.calculateEMA(macdValues, 9);
    const histogram = macdLine - signal;
    
    return {
      macd: Math.round(macdLine * 100) / 100,
      signal: Math.round(signal * 100) / 100,
      histogram: Math.round(histogram * 100) / 100
    };
  }
  
  // EMA Calculation
  private calculateEMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1];
    
    const multiplier = 2 / (period + 1);
    let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
    
    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] - ema) * multiplier + ema;
    }
    
    return ema;
  }
  
  // SMA Calculation
  private calculateSMA(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1];
    
    const relevantPrices = prices.slice(-period);
    return relevantPrices.reduce((a, b) => a + b, 0) / period;
  }
  
  // Moving Averages
  private calculateMovingAverages(prices: number[]) {
    return {
      sma20: Math.round(this.calculateSMA(prices, 20) * 100) / 100,
      sma50: Math.round(this.calculateSMA(prices, 50) * 100) / 100,
      sma200: Math.round(this.calculateSMA(prices, 200) * 100) / 100,
      ema12: Math.round(this.calculateEMA(prices, 12) * 100) / 100,
      ema26: Math.round(this.calculateEMA(prices, 26) * 100) / 100
    };
  }
  
  // Bollinger Bands
  private calculateBollingerBands(prices: number[], period: number = 20, stdDev: number = 2) {
    const sma = this.calculateSMA(prices, period);
    
    // Calculate standard deviation
    const relevantPrices = prices.slice(-period);
    const squaredDiffs = relevantPrices.map(price => Math.pow(price - sma, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
    const standardDeviation = Math.sqrt(variance);
    
    return {
      upper: Math.round((sma + (stdDev * standardDeviation)) * 100) / 100,
      middle: Math.round(sma * 100) / 100,
      lower: Math.round((sma - (stdDev * standardDeviation)) * 100) / 100
    };
  }
  
  // Stochastic Oscillator
  private calculateStochastic(closes: number[], highs: number[], lows: number[], period: number = 14) {
    if (closes.length < period) return { k: 50, d: 50 };
    
    const recentClose = closes[closes.length - 1];
    const periodHighs = highs.slice(-period);
    const periodLows = lows.slice(-period);
    
    const highestHigh = Math.max(...periodHighs);
    const lowestLow = Math.min(...periodLows);
    
    const k = ((recentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
    
    // %D is 3-period SMA of %K
    const kValues = [];
    for (let i = closes.length - 3; i < closes.length; i++) {
      if (i >= period - 1) {
        const high = Math.max(...highs.slice(i - period + 1, i + 1));
        const low = Math.min(...lows.slice(i - period + 1, i + 1));
        kValues.push(((closes[i] - low) / (high - low)) * 100);
      }
    }
    
    const d = kValues.reduce((a, b) => a + b, 0) / kValues.length;
    
    return {
      k: Math.round(k * 100) / 100,
      d: Math.round(d * 100) / 100
    };
  }
  
  // ATR (Average True Range)
  private calculateATR(highs: number[], lows: number[], closes: number[], period: number = 14): number {
    if (closes.length < period + 1) return 0;
    
    const trueRanges = [];
    for (let i = 1; i < closes.length; i++) {
      const highLow = highs[i] - lows[i];
      const highClose = Math.abs(highs[i] - closes[i - 1]);
      const lowClose = Math.abs(lows[i] - closes[i - 1]);
      trueRanges.push(Math.max(highLow, highClose, lowClose));
    }
    
    const recentTR = trueRanges.slice(-period);
    const atr = recentTR.reduce((a, b) => a + b, 0) / period;
    
    return Math.round(atr * 100) / 100;
  }
  
  // Volume Analysis
  private analyzeVolume(volumes: number[]) {
    const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    const currentVolume = volumes[volumes.length - 1];
    
    return {
      average: Math.round(avgVolume),
      ratio: Math.round((currentVolume / avgVolume) * 100) / 100
    };
  }
  
  // Pattern Recognition
  async detectPatterns(ticker: string): Promise<Pattern[]> {
    const patterns: Pattern[] = [];
    
    try {
      const indicators = await this.calculateIndicators(ticker);
      if (!indicators) return patterns;
      
      // Get recent price data
      const priceData = await pool.query(`
        SELECT data_json->>'price' as price
        FROM raw_data_collection
        WHERE UPPER(data_json->>'symbol') = UPPER($1)
        ORDER BY collected_at DESC
        LIMIT 50
      `, [ticker]);
      
      const prices = priceData.rows.map(r => parseFloat(r.price)).reverse();
      const currentPrice = prices[prices.length - 1];
      
      // RSI Patterns
      if (indicators.rsi < 30) {
        patterns.push({
          name: 'RSI Oversold',
          type: 'bullish',
          confidence: 70,
          description: `RSI at ${indicators.rsi} indicates oversold conditions`,
          entryPoint: currentPrice,
          stopLoss: currentPrice * 0.95,
          target: currentPrice * 1.05
        });
      } else if (indicators.rsi > 70) {
        patterns.push({
          name: 'RSI Overbought',
          type: 'bearish',
          confidence: 70,
          description: `RSI at ${indicators.rsi} indicates overbought conditions`,
          entryPoint: currentPrice,
          stopLoss: currentPrice * 1.05,
          target: currentPrice * 0.95
        });
      }
      
      // MACD Patterns
      if (indicators.macd.histogram > 0 && indicators.macd.macd > indicators.macd.signal) {
        patterns.push({
          name: 'MACD Bullish Crossover',
          type: 'bullish',
          confidence: 75,
          description: 'MACD crossed above signal line',
          entryPoint: currentPrice,
          target: currentPrice * 1.08
        });
      }
      
      // Bollinger Band Patterns
      if (currentPrice < indicators.bollingerBands.lower) {
        patterns.push({
          name: 'Bollinger Band Squeeze',
          type: 'bullish',
          confidence: 65,
          description: 'Price touching lower Bollinger Band',
          entryPoint: currentPrice,
          target: indicators.bollingerBands.middle
        });
      }
      
      // Moving Average Patterns
      if (indicators.movingAverages.sma50 > indicators.movingAverages.sma200) {
        patterns.push({
          name: 'Golden Cross',
          type: 'bullish',
          confidence: 80,
          description: '50-day MA above 200-day MA indicates uptrend'
        });
      }
      
      // Volume Patterns
      if (indicators.volume.ratio > 2) {
        patterns.push({
          name: 'Volume Spike',
          type: 'neutral',
          confidence: 60,
          description: `Volume ${indicators.volume.ratio}x above average`
        });
      }
      
      // Stochastic Patterns
      if (indicators.stochastic.k < 20 && indicators.stochastic.d < 20) {
        patterns.push({
          name: 'Stochastic Oversold',
          type: 'bullish',
          confidence: 65,
          description: 'Both %K and %D in oversold territory'
        });
      }
      
    } catch (error) {
      console.error('Pattern detection error:', error);
    }
    
    return patterns;
  }
  
  // Correlation Analysis
  async calculateCorrelations(): Promise<any> {
    try {
      const cryptos = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP'];
      const correlationMatrix: any = {};
      
      for (const crypto1 of cryptos) {
        correlationMatrix[crypto1] = {};
        
        for (const crypto2 of cryptos) {
          if (crypto1 === crypto2) {
            correlationMatrix[crypto1][crypto2] = 1.0;
            continue;
          }
          
          const correlation = await this.calculatePairCorrelation(crypto1, crypto2);
          correlationMatrix[crypto1][crypto2] = correlation;
        }
      }
      
      return correlationMatrix;
    } catch (error) {
      console.error('Correlation calculation error:', error);
      return {};
    }
  }
  
  private async calculatePairCorrelation(ticker1: string, ticker2: string): Promise<number> {
    try {
      // Get price data for both tickers
      const data1 = await pool.query(`
        SELECT 
          data_json->>'price' as price,
          collected_at
        FROM raw_data_collection
        WHERE UPPER(data_json->>'symbol') = UPPER($1)
        ORDER BY collected_at DESC
        LIMIT 100
      `, [ticker1]);
      
      const data2 = await pool.query(`
        SELECT 
          data_json->>'price' as price,
          collected_at
        FROM raw_data_collection
        WHERE UPPER(data_json->>'symbol') = UPPER($1)
        ORDER BY collected_at DESC
        LIMIT 100
      `, [ticker2]);
      
      if (data1.rows.length < 20 || data2.rows.length < 20) {
        return 0;
      }
      
      // Calculate returns
      const returns1 = this.calculateReturns(data1.rows.map(r => parseFloat(r.price)));
      const returns2 = this.calculateReturns(data2.rows.map(r => parseFloat(r.price)));
      
      // Calculate correlation coefficient
      const correlation = this.pearsonCorrelation(returns1, returns2);
      
      return Math.round(correlation * 100) / 100;
    } catch (error) {
      return 0;
    }
  }
  
  private calculateReturns(prices: number[]): number[] {
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i-1]) / prices[i-1]);
    }
    return returns;
  }
  
  private pearsonCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n < 2) return 0;
    
    const sumX = x.slice(0, n).reduce((a, b) => a + b, 0);
    const sumY = y.slice(0, n).reduce((a, b) => a + b, 0);
    const sumXY = x.slice(0, n).reduce((total, xi, i) => total + xi * y[i], 0);
    const sumX2 = x.slice(0, n).reduce((total, xi) => total + xi * xi, 0);
    const sumY2 = y.slice(0, n).reduce((total, yi) => total + yi * yi, 0);
    
    const correlation = (n * sumXY - sumX * sumY) / 
                       Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return isNaN(correlation) ? 0 : correlation;
  }
  
  // Backtesting
  async backtest(ticker: string, strategy: 'RSI' | 'MACD' | 'MA_CROSSOVER') {
    const results = {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      totalReturn: 0,
      maxDrawdown: 0,
      sharpeRatio: 0,
      trades: [] as any[]
    };
    
    // Simple backtest implementation
    // This would be expanded with real strategy logic
    
    return results;
  }
}

export default new TechnicalAnalysisService();
