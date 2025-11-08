// src/services/technicalAnalysis.ts
// PHASE 7C: Technical analysis - RSI, MACD, volume, patterns, support/resistance

import axios from 'axios';

interface TechnicalSignal {
  source: string;
  type: 'technical_signal';
  timestamp: Date;
  title: string;
  content: string;
  ticker: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  metadata: any;
}

interface TechnicalIndicators {
  rsi: number | null;
  macd: { value: number; signal: number; histogram: number } | null;
  movingAverages: { ma20: number; ma50: number; ma200: number } | null;
  volume: { current: number; average: number; ratio: number } | null;
  support: number | null;
  resistance: number | null;
  pattern: string | null;
}

class TechnicalAnalysisService {
  
  /**
   * Fetch technical analysis for multiple tickers
   */
  async fetchAll(tickers: string[] = ['SPY', 'QQQ', 'AAPL', 'NVDA', 'TSLA', 'MSFT']): Promise<TechnicalSignal[]> {
    console.log('📈 Fetching technical analysis...');
    
    const allSignals: TechnicalSignal[] = [];
    
    try {
      for (const ticker of tickers) {
        const signals = await this.analyzeTicker(ticker);
        allSignals.push(...signals);
      }
      
      console.log(`✅ Technical analysis: ${allSignals.length} signals`);
      return allSignals;
      
    } catch (error: any) {
      console.error('❌ Technical analysis error:', error.message);
      return allSignals;
    }
  }

  /**
   * Analyze single ticker for technical signals
   */
  async analyzeTicker(ticker: string): Promise<TechnicalSignal[]> {
    const signals: TechnicalSignal[] = [];
    
    try {
      // Get technical indicators
      const indicators = await this.getTechnicalIndicators(ticker);
      
      // Analyze RSI
      if (indicators.rsi !== null) {
        const rsiSignal = this.analyzeRSI(ticker, indicators.rsi);
        if (rsiSignal) signals.push(rsiSignal);
      }
      
      // Analyze MACD
      if (indicators.macd !== null) {
        const macdSignal = this.analyzeMACD(ticker, indicators.macd);
        if (macdSignal) signals.push(macdSignal);
      }
      
      // Analyze Moving Averages
      if (indicators.movingAverages !== null) {
        const maSignal = this.analyzeMovingAverages(ticker, indicators.movingAverages);
        if (maSignal) signals.push(maSignal);
      }
      
      // Analyze Volume
      if (indicators.volume !== null) {
        const volumeSignal = this.analyzeVolume(ticker, indicators.volume);
        if (volumeSignal) signals.push(volumeSignal);
      }
      
      // Analyze Support/Resistance
      if (indicators.support !== null && indicators.resistance !== null) {
        const srSignal = this.analyzeSupportResistance(ticker, indicators.support, indicators.resistance);
        if (srSignal) signals.push(srSignal);
      }
      
      // Pattern Recognition
      if (indicators.pattern) {
        const patternSignal = this.analyzePattern(ticker, indicators.pattern);
        if (patternSignal) signals.push(patternSignal);
      }
      
    } catch (error: any) {
      console.warn(`⚠️ Technical analysis failed for ${ticker}:`, error.message);
    }
    
    return signals;
  }

  /**
   * Get technical indicators (mock data - replace with real API)
   */
  private async getTechnicalIndicators(ticker: string): Promise<TechnicalIndicators> {
    // In production, use Alpha Vantage, TradingView, or similar API
    
    // Mock technical data
    const mockData: { [key: string]: TechnicalIndicators } = {
      'SPY': {
        rsi: 58,
        macd: { value: 2.5, signal: 1.8, histogram: 0.7 },
        movingAverages: { ma20: 450, ma50: 445, ma200: 420 },
        volume: { current: 85000000, average: 75000000, ratio: 1.13 },
        support: 445,
        resistance: 460,
        pattern: null
      },
      'AAPL': {
        rsi: 72,
        macd: { value: 3.2, signal: 2.1, histogram: 1.1 },
        movingAverages: { ma20: 185, ma50: 180, ma200: 170 },
        volume: { current: 65000000, average: 55000000, ratio: 1.18 },
        support: 180,
        resistance: 195,
        pattern: 'Cup and Handle'
      },
      'NVDA': {
        rsi: 68,
        macd: { value: 15.5, signal: 12.0, histogram: 3.5 },
        movingAverages: { ma20: 495, ma50: 480, ma200: 450 },
        volume: { current: 45000000, average: 38000000, ratio: 1.18 },
        support: 485,
        resistance: 510,
        pattern: 'Ascending Triangle'
      },
      'TSLA': {
        rsi: 42,
        macd: { value: -2.5, signal: -1.2, histogram: -1.3 },
        movingAverages: { ma20: 245, ma50: 255, ma200: 265 },
        volume: { current: 125000000, average: 110000000, ratio: 1.14 },
        support: 235,
        resistance: 260,
        pattern: null
      },
      'MSFT': {
        rsi: 55,
        macd: { value: 1.8, signal: 1.5, histogram: 0.3 },
        movingAverages: { ma20: 420, ma50: 415, ma200: 400 },
        volume: { current: 28000000, average: 25000000, ratio: 1.12 },
        support: 410,
        resistance: 430,
        pattern: null
      }
    };
    
    return mockData[ticker] || {
      rsi: null,
      macd: null,
      movingAverages: null,
      volume: null,
      support: null,
      resistance: null,
      pattern: null
    };
  }

  /**
   * Analyze RSI (Relative Strength Index)
   */
  private analyzeRSI(ticker: string, rsi: number): TechnicalSignal | null {
    let sentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    let signal = '';
    
    if (rsi > 70) {
      sentiment = 'bearish';
      signal = `OVERBOUGHT: RSI at ${rsi.toFixed(1)} (>70). Stock may be due for pullback. Consider taking profits or waiting for better entry.`;
    } else if (rsi < 30) {
      sentiment = 'bullish';
      signal = `OVERSOLD: RSI at ${rsi.toFixed(1)} (<30). Stock may be oversold and due for bounce. Potential buying opportunity.`;
    } else if (rsi >= 50 && rsi <= 70) {
      sentiment = 'bullish';
      signal = `BULLISH MOMENTUM: RSI at ${rsi.toFixed(1)} (50-70 range). Strong uptrend with room to run.`;
    } else if (rsi >= 30 && rsi < 50) {
      sentiment = 'neutral';
      signal = `NEUTRAL: RSI at ${rsi.toFixed(1)} (30-50 range). No strong directional bias.`;
    }
    
    if (!signal) return null;
    
    return {
      source: 'Technical Analysis - RSI',
      type: 'technical_signal',
      timestamp: new Date(),
      title: `${ticker}: RSI ${rsi.toFixed(1)}`,
      content: signal,
      ticker: ticker,
      sentiment: sentiment,
      metadata: {
        indicator: 'RSI',
        value: rsi,
        threshold: rsi > 70 ? 'Overbought' : rsi < 30 ? 'Oversold' : 'Normal'
      }
    };
  }

  /**
   * Analyze MACD (Moving Average Convergence Divergence)
   */
  private analyzeMACD(ticker: string, macd: { value: number; signal: number; histogram: number }): TechnicalSignal | null {
    const { value, signal, histogram } = macd;
    
    let sentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    let signalText = '';
    
    if (histogram > 0 && value > signal) {
      sentiment = 'bullish';
      signalText = `BULLISH CROSSOVER: MACD (${value.toFixed(2)}) above signal line (${signal.toFixed(2)}). Positive momentum building. Histogram: ${histogram.toFixed(2)}.`;
    } else if (histogram < 0 && value < signal) {
      sentiment = 'bearish';
      signalText = `BEARISH CROSSOVER: MACD (${value.toFixed(2)}) below signal line (${signal.toFixed(2)}). Negative momentum building. Histogram: ${histogram.toFixed(2)}.`;
    } else if (Math.abs(histogram) > 2) {
      sentiment = histogram > 0 ? 'bullish' : 'bearish';
      signalText = `STRONG TREND: Large histogram (${histogram.toFixed(2)}) indicates strong ${histogram > 0 ? 'bullish' : 'bearish'} momentum.`;
    }
    
    if (!signalText) return null;
    
    return {
      source: 'Technical Analysis - MACD',
      type: 'technical_signal',
      timestamp: new Date(),
      title: `${ticker}: MACD ${sentiment.toUpperCase()}`,
      content: signalText,
      ticker: ticker,
      sentiment: sentiment,
      metadata: {
        indicator: 'MACD',
        value: value,
        signal: signal,
        histogram: histogram
      }
    };
  }

  /**
   * Analyze Moving Averages
   */
  private analyzeMovingAverages(ticker: string, ma: { ma20: number; ma50: number; ma200: number }): TechnicalSignal | null {
    const { ma20, ma50, ma200 } = ma;
    
    let sentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    let signal = '';
    
    // Golden Cross: 50-day crosses above 200-day
    if (ma50 > ma200 && ma20 > ma50) {
      sentiment = 'bullish';
      signal = `GOLDEN CROSS: All moving averages aligned bullishly (20>${ma20.toFixed(0)} > 50>${ma50.toFixed(0)} > 200>${ma200.toFixed(0)}). Strong uptrend confirmed.`;
    }
    // Death Cross: 50-day crosses below 200-day
    else if (ma50 < ma200 && ma20 < ma50) {
      sentiment = 'bearish';
      signal = `DEATH CROSS: All moving averages aligned bearishly (20>${ma20.toFixed(0)} < 50>${ma50.toFixed(0)} < 200>${ma200.toFixed(0)}). Downtrend confirmed.`;
    }
    // Short-term bullish
    else if (ma20 > ma50) {
      sentiment = 'bullish';
      signal = `SHORT-TERM BULLISH: 20-day MA (${ma20.toFixed(0)}) above 50-day MA (${ma50.toFixed(0)}). Price holding above key support.`;
    }
    // Short-term bearish
    else if (ma20 < ma50) {
      sentiment = 'bearish';
      signal = `SHORT-TERM BEARISH: 20-day MA (${ma20.toFixed(0)}) below 50-day MA (${ma50.toFixed(0)}). Weakness developing.`;
    }
    
    if (!signal) return null;
    
    return {
      source: 'Technical Analysis - Moving Averages',
      type: 'technical_signal',
      timestamp: new Date(),
      title: `${ticker}: MA ${sentiment.toUpperCase()}`,
      content: signal,
      ticker: ticker,
      sentiment: sentiment,
      metadata: {
        indicator: 'Moving Averages',
        ma20: ma20,
        ma50: ma50,
        ma200: ma200
      }
    };
  }

  /**
   * Analyze Volume
   */
  private analyzeVolume(ticker: string, vol: { current: number; average: number; ratio: number }): TechnicalSignal | null {
    const { current, average, ratio } = vol;
    
    if (ratio < 1.2) return null; // Not unusual enough
    
    let sentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    let signal = '';
    
    if (ratio >= 1.5) {
      sentiment = 'bullish';
      signal = `UNUSUAL VOLUME: ${(ratio * 100).toFixed(0)}% above average (${(current / 1_000_000).toFixed(1)}M vs avg ${(average / 1_000_000).toFixed(1)}M). Strong institutional interest. Possible breakout incoming.`;
    } else if (ratio >= 1.2) {
      sentiment = 'bullish';
      signal = `ELEVATED VOLUME: ${(ratio * 100).toFixed(0)}% above average (${(current / 1_000_000).toFixed(1)}M vs avg ${(average / 1_000_000).toFixed(1)}M). Increased interest.`;
    }
    
    if (!signal) return null;
    
    return {
      source: 'Technical Analysis - Volume',
      type: 'technical_signal',
      timestamp: new Date(),
      title: `${ticker}: Volume Spike`,
      content: signal,
      ticker: ticker,
      sentiment: sentiment,
      metadata: {
        indicator: 'Volume',
        current: current,
        average: average,
        ratio: ratio
      }
    };
  }

  /**
   * Analyze Support/Resistance
   */
  private analyzeSupportResistance(ticker: string, support: number, resistance: number): TechnicalSignal | null {
    // Would need current price to make this meaningful
    // For now, just report the levels
    
    return {
      source: 'Technical Analysis - Support/Resistance',
      type: 'technical_signal',
      timestamp: new Date(),
      title: `${ticker}: Key Levels`,
      content: `Support at $${support.toFixed(2)}, Resistance at $${resistance.toFixed(2)}. Watch for breakout above resistance or breakdown below support for trading opportunities.`,
      ticker: ticker,
      sentiment: 'neutral',
      metadata: {
        indicator: 'Support/Resistance',
        support: support,
        resistance: resistance,
        range: resistance - support
      }
    };
  }

  /**
   * Analyze Chart Patterns
   */
  private analyzePattern(ticker: string, pattern: string): TechnicalSignal | null {
    const patterns: { [key: string]: { sentiment: 'bullish' | 'bearish'; description: string } } = {
      'Cup and Handle': {
        sentiment: 'bullish',
        description: 'Classic bullish continuation pattern. Expect breakout to new highs. Target: +15-20% from cup depth.'
      },
      'Head and Shoulders': {
        sentiment: 'bearish',
        description: 'Bearish reversal pattern. Breakdown below neckline signals trend change. Target: Height of head subtracted from neckline.'
      },
      'Ascending Triangle': {
        sentiment: 'bullish',
        description: 'Bullish continuation pattern. Horizontal resistance with rising support. Breakout likely upward.'
      },
      'Descending Triangle': {
        sentiment: 'bearish',
        description: 'Bearish continuation pattern. Horizontal support with declining resistance. Breakdown likely.'
      },
      'Double Bottom': {
        sentiment: 'bullish',
        description: 'Bullish reversal pattern. Two lows at similar level signal bottom formation. Breakout targets previous high.'
      },
      'Double Top': {
        sentiment: 'bearish',
        description: 'Bearish reversal pattern. Two peaks at similar level signal top formation. Breakdown targets previous low.'
      }
    };
    
    const patternInfo = patterns[pattern];
    if (!patternInfo) return null;
    
    return {
      source: 'Technical Analysis - Pattern',
      type: 'technical_signal',
      timestamp: new Date(),
      title: `${ticker}: ${pattern} Pattern`,
      content: `${pattern.toUpperCase()} pattern detected: ${patternInfo.description}`,
      ticker: ticker,
      sentiment: patternInfo.sentiment,
      metadata: {
        indicator: 'Chart Pattern',
        pattern: pattern,
        reliability: 'Medium-High'
      }
    };
  }

  /**
   * Get technical analysis for specific ticker
   */
  async getForTicker(ticker: string): Promise<TechnicalSignal[]> {
    return await this.analyzeTicker(ticker);
  }
}

export default new TechnicalAnalysisService();
