// src/services/aiPatternDetectionEngine.ts
// Analyzes 3 years of data to find crypto-stock correlations

import Anthropic from '@anthropic-ai/sdk';
import { pool } from '../db/index.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY
});

interface CorrelationPattern {
  cryptoSymbol: string;
  stockSymbol: string;
  cryptoMovePercent: number;
  stockResponsePercent: number;
  correlationStrength: number;
  accuracyRate: number;
  sampleSize: number;
  pattern: string;
}

class AIPatternDetectionEngine {
  
  /**
   * Main analysis - find all weekend crypto → Monday stock patterns
   */
  async detectWeekendPatterns() {
    console.log('🧠 AI Pattern Detection: Weekend Crypto → Monday Stock');
    
    const patterns: CorrelationPattern[] = [];
    
    // Analyze major pairs
    const cryptoPairs = [
      { crypto: 'BTC', stocks: ['SPY', 'QQQ', 'COIN', 'MSTR'] },
      { crypto: 'ETH', stocks: ['SPY', 'QQQ', 'COIN'] },
      { crypto: 'SOL', stocks: ['SPY', 'COIN'] }
    ];
    
    for (const pair of cryptoPairs) {
      for (const stock of pair.stocks) {
        const pattern = await this.analyzeWeekendPattern(pair.crypto, stock);
        if (pattern) patterns.push(pattern);
      }
    }
    
    // Store patterns
    await this.storePatterns(patterns);
    
    console.log(`✅ Detected ${patterns.length} correlation patterns`);
    return patterns;
  }
  
  /**
   * Analyze specific crypto-stock weekend pattern
   */
  private async analyzeWeekendPattern(cryptoSymbol: string, stockSymbol: string) {
    console.log(`  📊 Analyzing ${cryptoSymbol} → ${stockSymbol}...`);
    
    // Get weekend crypto moves - FIXED QUERY
    const weekendMoves = await pool.query(`
      WITH weekly_data AS (
        SELECT 
          DATE_TRUNC('week', timestamp) as week_start,
          timestamp,
          price,
          day_of_week,
          hour_of_day,
          ROW_NUMBER() OVER (PARTITION BY DATE_TRUNC('week', timestamp), day_of_week ORDER BY timestamp DESC) as rn
        FROM crypto_historical_prices
        WHERE symbol = $1
        AND (
          (day_of_week = 5 AND hour_of_day >= 16) OR
          (day_of_week = 6) OR
          (day_of_week = 0)
        )
      ),
      weekly_summary AS (
        SELECT 
          week_start,
          MAX(CASE WHEN day_of_week = 5 AND rn = 1 THEN price END) as friday_close,
          MAX(CASE WHEN day_of_week = 0 AND rn = 1 THEN price END) as sunday_close
        FROM weekly_data
        GROUP BY week_start
      )
      SELECT 
        week_start,
        friday_close,
        sunday_close,
        ((sunday_close - friday_close) / NULLIF(friday_close, 0) * 100) as weekend_change_percent
      FROM weekly_summary
      WHERE friday_close IS NOT NULL 
      AND sunday_close IS NOT NULL
      ORDER BY week_start DESC
      LIMIT 150
    `, [cryptoSymbol]);
    
    // Get Monday stock opens
    const mondayOpens = await pool.query(`
      SELECT 
        date,
        open_price,
        previous_friday_close,
        ((open_price - previous_friday_close) / NULLIF(previous_friday_close, 0) * 100) as monday_gap_percent
      FROM stock_historical_prices
      WHERE symbol = $1
      AND is_monday_open = true
      AND previous_friday_close IS NOT NULL
      ORDER BY date DESC
      LIMIT 150
    `, [stockSymbol]);
    
    if (weekendMoves.rows.length < 50 || mondayOpens.rows.length < 50) {
      console.log(`    ⚠️  Insufficient data (${weekendMoves.rows.length} crypto, ${mondayOpens.rows.length} stock)`);
      return null;
    }
    
    // Match crypto weekends to stock Mondays
    const matches = this.matchWeekendToMonday(
      weekendMoves.rows,
      mondayOpens.rows
    );
    
    if (matches.length < 30) {
      console.log(`    ⚠️  Insufficient matches (${matches.length})`);
      return null;
    }
    
    // Calculate correlation
    const correlation = this.calculateCorrelation(matches);
    
    // Use AI to analyze pattern significance
    const aiAnalysis = await this.analyzeWithClaude(
      cryptoSymbol,
      stockSymbol,
      matches,
      correlation
    );
    
    if (aiAnalysis.isSignificant) {
      console.log(`    ✅ Pattern found: ${correlation.strength.toFixed(3)} correlation, ${aiAnalysis.accuracyRate}% accuracy`);
      
      return {
        cryptoSymbol,
        stockSymbol,
        cryptoMovePercent: correlation.avgCryptoMove,
        stockResponsePercent: correlation.avgStockMove,
        correlationStrength: correlation.strength,
        accuracyRate: aiAnalysis.accuracyRate,
        sampleSize: matches.length,
        pattern: aiAnalysis.patternDescription
      };
    }
    
    console.log(`    ❌ No significant pattern`);
    return null;
  }
  
  /**
   * Match weekend crypto data to Monday stock data
   */
  private matchWeekendToMonday(cryptoWeekends: any[], stockMondays: any[]) {
    const matches = [];
    
    for (const crypto of cryptoWeekends) {
      const cryptoWeekStart = new Date(crypto.week_start);
      const nextMonday = new Date(cryptoWeekStart);
      nextMonday.setDate(nextMonday.getDate() + 3);
      
      const stockMatch = stockMondays.find(stock => {
        const stockDate = new Date(stock.date);
        const diffDays = Math.abs((stockDate.getTime() - nextMonday.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays <= 1;
      });
      
      if (stockMatch) {
        matches.push({
          cryptoMove: parseFloat(crypto.weekend_change_percent),
          stockMove: parseFloat(stockMatch.monday_gap_percent),
          week: crypto.week_start
        });
      }
    }
    
    return matches;
  }
  
  /**
   * Calculate correlation coefficient
   */
  private calculateCorrelation(matches: any[]) {
    const n = matches.length;
    const cryptoMoves = matches.map(m => m.cryptoMove);
    const stockMoves = matches.map(m => m.stockMove);
    
    const avgCrypto = cryptoMoves.reduce((a, b) => a + b, 0) / n;
    const avgStock = stockMoves.reduce((a, b) => a + b, 0) / n;
    
    let numerator = 0;
    let cryptoSumSq = 0;
    let stockSumSq = 0;
    
    for (let i = 0; i < n; i++) {
      const cryptoDiff = cryptoMoves[i] - avgCrypto;
      const stockDiff = stockMoves[i] - avgStock;
      
      numerator += cryptoDiff * stockDiff;
      cryptoSumSq += cryptoDiff * cryptoDiff;
      stockSumSq += stockDiff * stockDiff;
    }
    
    const denominator = Math.sqrt(cryptoSumSq * stockSumSq);
    const correlation = denominator === 0 ? 0 : numerator / denominator;
    
    return {
      strength: correlation,
      avgCryptoMove: avgCrypto,
      avgStockMove: avgStock
    };
  }
  
  /**
   * Use Claude AI to validate pattern significance
   */
  private async analyzeWithClaude(
    cryptoSymbol: string,
    stockSymbol: string,
    matches: any[],
    correlation: any
  ) {
    const sampleMatches = matches.slice(0, 20).map(m => ({
      crypto_move: m.cryptoMove.toFixed(2) + '%',
      stock_response: m.stockMove.toFixed(2) + '%',
      direction_match: (m.cryptoMove > 0 && m.stockMove > 0) || (m.cryptoMove < 0 && m.stockMove < 0)
    }));
    
    const directionalAccuracy = matches.filter(m => 
      (m.cryptoMove > 0 && m.stockMove > 0) || (m.cryptoMove < 0 && m.stockMove < 0)
    ).length / matches.length * 100;
    
    const prompt = `Analyze this crypto-stock correlation pattern:

**Pattern:** ${cryptoSymbol} weekend movement → ${stockSymbol} Monday open
**Correlation Strength:** ${correlation.strength.toFixed(3)}
**Sample Size:** ${matches.length} weeks
**Directional Accuracy:** ${directionalAccuracy.toFixed(1)}% (same direction)
**Average ${cryptoSymbol} Weekend Move:** ${correlation.avgCryptoMove.toFixed(2)}%
**Average ${stockSymbol} Monday Response:** ${correlation.avgStockMove.toFixed(2)}%

**Sample Data (last 20 weeks):**
${JSON.stringify(sampleMatches, null, 2)}

Determine:
1. Is this pattern statistically significant and tradeable?
2. What's the accuracy rate for directional prediction?
3. Brief pattern description for traders

Respond ONLY with valid JSON:
{
  "isSignificant": true/false,
  "accuracyRate": 0-100,
  "patternDescription": "When BTC moves +X% on weekend, SPY typically...",
  "tradeableConfidence": 0-100,
  "reasoning": "Statistical analysis..."
}`;

    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      });
      
      const text = message.content[0].type === 'text' ? message.content[0].text : '{}';
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(cleaned);
      
    } catch (error) {
      console.error('AI analysis failed:', error);
      return {
        isSignificant: Math.abs(correlation.strength) > 0.3 && directionalAccuracy > 60,
        accuracyRate: directionalAccuracy,
        patternDescription: `${cryptoSymbol} weekend moves show ${correlation.strength > 0 ? 'positive' : 'negative'} correlation with ${stockSymbol} Monday opens`,
        tradeableConfidence: 50
      };
    }
  }
  
  /**
   * Store discovered patterns
   */
  private async storePatterns(patterns: CorrelationPattern[]) {
    for (const pattern of patterns) {
      await pool.query(`
        INSERT INTO correlation_patterns 
        (pattern_type, crypto_symbol, stock_symbol, crypto_move_percent, stock_response_percent,
         correlation_strength, accuracy_rate, sample_size, confidence_score, pattern_description,
         date_range_start, date_range_end, market_condition)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT DO NOTHING
      `, [
        'weekend_crypto_to_monday_open',
        pattern.cryptoSymbol,
        pattern.stockSymbol,
        pattern.cryptoMovePercent,
        pattern.stockResponsePercent,
        pattern.correlationStrength,
        pattern.accuracyRate,
        pattern.sampleSize,
        pattern.accuracyRate,
        pattern.pattern,
        new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000),
        new Date(),
        'all_markets'
      ]);
    }
  }
  
  /**
   * Get active patterns for live trading
   */
  async getActivePatterns(minAccuracy: number = 65) {
    const result = await pool.query(`
      SELECT * FROM correlation_patterns
      WHERE is_active = true
      AND accuracy_rate >= $1
      ORDER BY accuracy_rate DESC, sample_size DESC
    `, [minAccuracy]);
    
    return result.rows;
  }
}

export default new AIPatternDetectionEngine();
