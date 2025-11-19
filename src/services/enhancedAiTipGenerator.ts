// src/services/enhancedAiTipGenerator.ts
// 3-Tier Opportunity Engine: Blue Chips + Explosive Growth + Crypto Alpha

import Anthropic from '@anthropic-ai/sdk';
import pool from '../db/index.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY
});

interface OpportunityTip {
  ticker: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  tier: 'blue_chip' | 'explosive_growth' | 'crypto_alpha';
  entry_price: number;
  target_price: number;
  stop_loss: number;
  expected_gain_percent: number;
  risk_score: number; // 1-10
  confidence: number; // 0-100
  timeframe: string;
  catalysts: string[];
  reasoning: string;
  exit_strategy: string;
}

class EnhancedAiTipGenerator {
  
  /**
   * Generate all 3 tiers of tips
   */
  async generateComprehensiveTips() {
    console.log('🧠 Generating comprehensive AI tips (3 tiers)...');
    
    const allTips: OpportunityTip[] = [];
    
    // Tier 1: Blue Chip High Confidence
    const blueChips = await this.generateBlueChipTips();
    allTips.push(...blueChips);
    
    // Tier 2: Explosive Growth Opportunities
    const explosiveGrowth = await this.generateExplosiveGrowthTips();
    allTips.push(...explosiveGrowth);
    
    // Tier 3: Crypto Alpha Plays
    const cryptoAlpha = await this.generateCryptoAlphaTips();
    allTips.push(...cryptoAlpha);
    
    // Store all tips
    await this.storeTips(allTips);
    
    console.log(`✅ Generated ${allTips.length} total tips:`);
    console.log(`   - ${blueChips.length} Blue Chip plays`);
    console.log(`   - ${explosiveGrowth.length} Explosive Growth plays`);
    console.log(`   - ${cryptoAlpha.length} Crypto Alpha plays`);
    
    return allTips;
  }
  
  /**
   * Tier 1: Blue Chip High Confidence Plays
   */
  private async generateBlueChipTips(): Promise<OpportunityTip[]> {
    console.log('   📊 Generating Blue Chip tips...');
    
    // Get recent intelligence on major stocks
    const intelligence = await pool.query(`
      SELECT * FROM digest_entries
      WHERE tickers && ARRAY['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META']
      AND created_at >= NOW() - INTERVAL '7 days'
      ORDER BY ai_relevance_score DESC
      LIMIT 50
    `);
    
    const tips = await this.analyzeWithClaude({
      tier: 'blue_chip',
      data: intelligence.rows,
      prompt: `Analyze major tech stocks for HIGH CONFIDENCE plays.
      
Focus on: AAPL, MSFT, GOOGL, AMZN, TSLA, NVDA, META
Requirements:
- 70%+ confidence only
- Lower risk (3-5 risk score)
- Steady gains (10-20% targets)
- Strong fundamentals + recent catalysts

Return 5 best plays in JSON array.`
    });
    
    return tips;
  }
  
  /**
   * Tier 2: Explosive Growth Opportunities
   */
  private async generateExplosiveGrowthTips(): Promise<OpportunityTip[]> {
    console.log('   🚀 Generating Explosive Growth tips...');
    
    // Get intelligence on small/mid caps with recent catalysts
    const intelligence = await pool.query(`
      SELECT 
        de.*,
        COUNT(*) OVER (PARTITION BY unnest(de.tickers)) as mention_frequency
      FROM digest_entries de
      WHERE 
        de.created_at >= NOW() - INTERVAL '3 days'
        AND de.ai_relevance_score >= 70
        AND (
          de.source_type IN ('sec_filings', 'earnings', 'insider_trading', 'm_and_a')
          OR de.ai_summary ILIKE '%breakthrough%'
          OR de.ai_summary ILIKE '%contract%'
          OR de.ai_summary ILIKE '%FDA%'
          OR de.ai_summary ILIKE '%acquisition%'
        )
      ORDER BY de.ai_relevance_score DESC, mention_frequency DESC
      LIMIT 100
    `);
    
    // Get insider trading activity
    const insiderTrades = await pool.query(`
      SELECT * FROM digest_entries
      WHERE source_type = 'insider_trading'
      AND created_at >= NOW() - INTERVAL '7 days'
      ORDER BY ai_relevance_score DESC
      LIMIT 20
    `);
    
    // Get M&A activity
    const maActivity = await pool.query(`
      SELECT * FROM digest_entries
      WHERE source_type = 'm_and_a'
      AND created_at >= NOW() - INTERVAL '14 days'
      ORDER BY ai_relevance_score DESC
      LIMIT 20
    `);
    
    const tips = await this.analyzeWithClaude({
      tier: 'explosive_growth',
      data: {
        intelligence: intelligence.rows,
        insiderTrades: insiderTrades.rows,
        maActivity: maActivity.rows
      },
      prompt: `Find EXPLOSIVE GROWTH opportunities in small/mid cap stocks.

Look for:
- Recent catalysts (FDA approval, contracts, acquisitions, partnerships)
- Insider buying patterns
- M&A activity
- Breakthrough technology/products
- Unusual volume/momentum

Requirements:
- 40-80% gain potential
- Define clear stop loss (5-10%)
- Risk score 6-9 (high reward, higher risk)
- Entry, target, and exit strategy
- Specific catalysts driving the move

Return 5 best explosive opportunities in JSON array.`
    });
    
    return tips;
  }
  
  /**
   * Tier 3: Crypto Alpha Plays
   */
  private async generateCryptoAlphaTips(): Promise<OpportunityTip[]> {
    console.log('   ₿ Generating Crypto Alpha tips...');
    
    // Get weekend correlation predictions
    const correlationPredictions = await pool.query(`
      SELECT * FROM correlation_predictions
      WHERE status = 'pending'
      AND crypto_symbol IN ('BTC', 'ETH', 'SOL')
      ORDER BY confidence DESC
      LIMIT 10
    `);
    
    // Get whale movements
    const whaleMovements = await pool.query(`
      SELECT * FROM whale_movements
      WHERE timestamp >= NOW() - INTERVAL '7 days'
      ORDER BY usd_value DESC
      LIMIT 20
    `);
    
    // Get crypto news
    const cryptoNews = await pool.query(`
      SELECT * FROM digest_entries
      WHERE source_type = 'crypto'
      AND created_at >= NOW() - INTERVAL '3 days'
      ORDER BY ai_relevance_score DESC
      LIMIT 50
    `);
    
    const tips = await this.analyzeWithClaude({
      tier: 'crypto_alpha',
      data: {
        correlationPredictions: correlationPredictions.rows,
        whaleMovements: whaleMovements.rows,
        cryptoNews: cryptoNews.rows
      },
      prompt: `Find CRYPTO ALPHA opportunities with edge.

Analyze:
- Weekend crypto → Monday stock correlation predictions
- Whale wallet movements (large buys/sells)
- DeFi protocol changes
- Layer 2 momentum
- Regulatory news impact

Requirements:
- 30-100%+ gain potential
- Clear stop loss (10-15%)
- Risk score 7-10 (crypto volatility)
- Entry timing (weekend vs weekday)
- Exit strategy based on targets

Focus on: BTC, ETH, SOL, and related crypto stocks (COIN, MSTR)

Return 5 best crypto alpha plays in JSON array.`
    });
    
    return tips;
  }
  
  /**
   * Analyze with Claude AI
   */
  private async analyzeWithClaude(context: any): Promise<OpportunityTip[]> {
    const { tier, data, prompt } = context;
    
    const fullPrompt = `${prompt}

**DATA:**
${JSON.stringify(data, null, 2)}

Return EXACT JSON array format:
[
  {
    "ticker": "SYMBOL",
    "action": "BUY",
    "tier": "${tier}",
    "entry_price": 150.50,
    "target_price": 180.00,
    "stop_loss": 142.50,
    "expected_gain_percent": 19.6,
    "risk_score": 5,
    "confidence": 78,
    "timeframe": "2-4 weeks",
    "catalysts": ["Q4 earnings beat expected", "New product launch"],
    "reasoning": "Strong fundamentals with recent catalyst...",
    "exit_strategy": "Sell 50% at +15%, remainder at target or stop loss"
  }
]

CRITICAL: Return ONLY valid JSON array. No markdown, no explanation.`;

    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{ role: 'user', content: fullPrompt }]
      });
      
      const text = message.content[0].type === 'text' ? message.content[0].text : '[]';
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      return JSON.parse(cleaned);
      
    } catch (error) {
      console.error(`AI analysis failed for ${tier}:`, error);
      return [];
    }
  }
  
  /**
   * Store tips in database
   */
  private async storeTips(tips: OpportunityTip[]) {
    for (const tip of tips) {
      try {
        await pool.query(`
          INSERT INTO ai_stock_tips 
          (ticker, action, tier, entry_price, target_price, stop_loss, 
           expected_gain_percent, risk_score, confidence, timeframe, 
           catalysts, reasoning, exit_strategy, status, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'active', NOW())
        `, [
          tip.ticker,
          tip.action,
          tip.tier,
          tip.entry_price,
          tip.target_price,
          tip.stop_loss,
          tip.expected_gain_percent,
          tip.risk_score,
          tip.confidence,
          tip.timeframe,
          JSON.stringify(tip.catalysts),
          tip.reasoning,
          tip.exit_strategy
        ]);
      } catch (error) {
        console.error(`Failed to store tip for ${tip.ticker}:`, error);
      }
    }
  }
  
  /**
   * Get active tips by tier
   */
  async getTipsByTier(tier: string) {
    const result = await pool.query(`
      SELECT * FROM ai_stock_tips
      WHERE tier = $1
      AND status = 'active'
      ORDER BY confidence DESC, expected_gain_percent DESC
    `, [tier]);
    
    return result.rows;
  }
}

export default new EnhancedAiTipGenerator();
