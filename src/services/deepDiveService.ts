// backend/src/services/deepDiveService.ts
// Deep market analysis: Ticker of the Day, Pattern Watch, Risk Monitor, Political Intelligence

import Anthropic from '@anthropic-ai/sdk';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY
});

interface DeepDiveAnalysis {
  ticker: string;
  company_name: string;
  analysis: string; // 2000+ words
  key_points: string[];
  bull_case: string;
  bear_case: string;
  technical_outlook: string;
  fundamental_outlook: string;
  catalysts: string[];
  risks: string[];
  price_target: number | null;
  recommendation: string;
  confidence: number;
  generated_at: Date;
}

interface PatternMatch {
  pattern_name: string;
  description: string;
  historical_context: string;
  current_similarity: number;
  implications: string;
  historical_outcome: string;
}

interface RiskAssessment {
  overall_risk_level: string; // low, medium, high, extreme
  risk_score: number; // 0-100
  top_risks: Array<{
    category: string;
    description: string;
    severity: string;
    probability: string;
    impact: string;
  }>;
  market_indicators: {
    volatility: string;
    sentiment: string;
    technical: string;
  };
  recommendations: string[];
}

interface PoliticalIntelligence {
  summary: string;
  key_developments: Array<{
    event: string;
    impact: string;
    affected_sectors: string[];
    timeframe: string;
  }>;
  policy_changes: string[];
  geopolitical_risks: string[];
  opportunities: string[];
}

class DeepDiveService {
  
  /**
   * Generate comprehensive deep dive on a ticker (with caching)
   */
  async generateTickerDeepDive(ticker?: string): Promise<DeepDiveAnalysis> {
    console.log('📊 Generating Ticker deep dive...');
    
    // If no ticker specified, pick the most mentioned ticker from recent high-priority entries
    if (!ticker) {
      ticker = await this.selectTickerOfTheDay();
    }
    
    ticker = ticker.toUpperCase();
    console.log(`  ✓ Selected ticker: ${ticker}`);
    
    // Check cache first (same day only)
    const cached = await this.getCachedAnalysis(ticker);
    if (cached) {
      console.log(`  ✓ Using cached analysis for ${ticker}`);
      return cached;
    }
    
    // Not in cache, generate new analysis
    console.log(`  ✓ Generating new analysis for ${ticker}...`);
    
    // Get relevant entries about this ticker
    const entries = await this.getTickerRelevantEntries(ticker);
    console.log(`  ✓ Found ${entries.length} relevant entries`);
    
    // Generate comprehensive analysis
    const analysis = await this.generateAnalysis(ticker, entries);
    
    // Cache the result
    await this.cacheAnalysis(analysis);
    console.log(`  ✓ Cached analysis for ${ticker}`);
    
    return analysis;
  }
  
  /**
   * Get cached analysis for ticker (today only)
   */
  private async getCachedAnalysis(ticker: string): Promise<DeepDiveAnalysis | null> {
    try {
      const result = await pool.query(`
        SELECT * FROM deep_dive_cache
        WHERE ticker = $1
          AND created_date = CURRENT_DATE
        LIMIT 1
      `, [ticker]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return {
        ticker: row.ticker,
        company_name: row.company_name,
        analysis: row.analysis,
        key_points: row.key_points,
        bull_case: row.bull_case,
        bear_case: row.bear_case,
        technical_outlook: row.technical_outlook,
        fundamental_outlook: row.fundamental_outlook,
        catalysts: row.catalysts,
        risks: row.risks,
        price_target: row.price_target,
        recommendation: row.recommendation,
        confidence: row.confidence,
        generated_at: row.generated_at
      };
    } catch (error) {
      console.error('Error fetching cached analysis:', error);
      return null;
    }
  }
  
  /**
   * Cache analysis in database
   */
  private async cacheAnalysis(analysis: DeepDiveAnalysis): Promise<void> {
    try {
      await pool.query(`
        INSERT INTO deep_dive_cache (
          ticker, company_name, analysis, key_points, bull_case, bear_case,
          technical_outlook, fundamental_outlook, catalysts, risks,
          price_target, recommendation, confidence
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (ticker, created_date) DO NOTHING
      `, [
        analysis.ticker,
        analysis.company_name,
        analysis.analysis,
        JSON.stringify(analysis.key_points),
        analysis.bull_case,
        analysis.bear_case,
        analysis.technical_outlook,
        analysis.fundamental_outlook,
        JSON.stringify(analysis.catalysts),
        JSON.stringify(analysis.risks),
        analysis.price_target,
        analysis.recommendation,
        analysis.confidence
      ]);
    } catch (error) {
      console.error('Error caching analysis:', error);
      // Don't fail if caching fails
    }
  }
  
  /**
   * Get all cached analyses for today
   */
  async getTodaysCachedAnalyses(): Promise<DeepDiveAnalysis[]> {
    try {
      const result = await pool.query(`
        SELECT * FROM deep_dive_cache
        WHERE created_date = CURRENT_DATE
        ORDER BY generated_at DESC
      `);
      
      return result.rows.map(row => ({
        ticker: row.ticker,
        company_name: row.company_name,
        analysis: row.analysis,
        key_points: row.key_points,
        bull_case: row.bull_case,
        bear_case: row.bear_case,
        technical_outlook: row.technical_outlook,
        fundamental_outlook: row.fundamental_outlook,
        catalysts: row.catalysts,
        risks: row.risks,
        price_target: row.price_target,
        recommendation: row.recommendation,
        confidence: row.confidence,
        generated_at: row.generated_at
      }));
    } catch (error) {
      console.error('Error fetching cached analyses:', error);
      return [];
    }
  }
  
  /**
   * Select the most interesting ticker for today
   */
  private async selectTickerOfTheDay(): Promise<string> {
    // Simplified approach: just get the most mentioned ticker from high-priority entries
    const result = await pool.query(`
      SELECT ai_summary, ai_entities_tickers, ai_relevance_score
      FROM digest_entries
      WHERE event_date >= NOW() - INTERVAL '48 hours'
        AND ai_entities_tickers IS NOT NULL
        AND jsonb_array_length(ai_entities_tickers) > 0
        AND ai_relevance_score >= 70
      ORDER BY ai_relevance_score DESC
      LIMIT 20
    `);
    
    // Count ticker mentions in JavaScript
    const tickerCounts: Record<string, number> = {};
    
    for (const row of result.rows) {
      try {
        const tickers = typeof row.ai_entities_tickers === 'string' 
          ? JSON.parse(row.ai_entities_tickers) 
          : row.ai_entities_tickers;
        
        if (Array.isArray(tickers)) {
          for (const ticker of tickers) {
            tickerCounts[ticker] = (tickerCounts[ticker] || 0) + 1;
          }
        }
      } catch (e) {
        // Skip invalid entries
      }
    }
    
    // Find most mentioned ticker
    let topTicker = 'AAPL';
    let maxCount = 0;
    
    for (const [ticker, count] of Object.entries(tickerCounts)) {
      if (count > maxCount) {
        maxCount = count;
        topTicker = ticker;
      }
    }
    
    console.log(`  ✓ Most mentioned ticker: ${topTicker} (${maxCount} mentions)`);
    return topTicker;
  }
  
  /**
   * Get entries relevant to a ticker
   */
  private async getTickerRelevantEntries(ticker: string): Promise<any[]> {
    // Simplified: just search in summary text
    const result = await pool.query(`
      SELECT 
        id,
        source_name,
        ai_summary,
        ai_relevance_score,
        ai_sentiment,
        event_date,
        ai_entities_tickers
      FROM digest_entries
      WHERE event_date >= NOW() - INTERVAL '7 days'
        AND ai_summary ILIKE '%' || $1 || '%'
      ORDER BY ai_relevance_score DESC, event_date DESC
      LIMIT 30
    `, [ticker]);
    
    return result.rows;
  }
  
  /**
   * Generate comprehensive analysis using AI
   */
  private async generateAnalysis(ticker: string, entries: any[]): Promise<DeepDiveAnalysis> {
    const entriesSummary = entries.map(e => 
      `[${e.source_name}] ${e.ai_summary} (Relevance: ${e.ai_relevance_score})`
    ).join('\n');
    
    const prompt = `You are a senior equity analyst. Write a COMPREHENSIVE 2000+ word deep dive analysis on ${ticker}.

AVAILABLE MARKET INTELLIGENCE:
${entriesSummary}

Your analysis must include:

1. EXECUTIVE SUMMARY (2-3 paragraphs)
   - Current situation
   - Key thesis
   - Recommendation

2. BUSINESS OVERVIEW (300+ words)
   - What the company does
   - Revenue streams
   - Competitive position
   - Market dynamics

3. RECENT DEVELOPMENTS (400+ words)
   - News and events from intelligence
   - Impact on business
   - Management actions

4. FUNDAMENTAL ANALYSIS (400+ words)
   - Revenue trends
   - Profitability
   - Balance sheet strength
   - Cash flow generation
   - Valuation metrics

5. TECHNICAL OUTLOOK (200+ words)
   - Price action
   - Key levels
   - Momentum indicators
   - Volume trends

6. BULL CASE (300+ words)
   - Reasons stock could significantly outperform
   - Catalysts and tailwinds
   - Best-case scenarios

7. BEAR CASE (300+ words)
   - Risks and headwinds
   - What could go wrong
   - Worst-case scenarios

8. CATALYSTS & TIMELINE
   - Upcoming events
   - Expected catalysts
   - Timeline for thesis to play out

9. RISKS TO MONITOR
   - Key risk factors
   - Warning signs

10. CONCLUSION & RECOMMENDATION
    - Overall assessment
    - BUY/HOLD/SELL recommendation
    - Price target (if applicable)
    - Confidence level (70-100%)

Write professionally, like a Motley Fool or Seeking Alpha deep dive. Be specific, data-driven, and balanced.

Respond with ONLY valid JSON (no markdown):
{
  "company_name": "Company Name Inc.",
  "analysis": "Full 2000+ word analysis as one string",
  "key_points": ["Point 1", "Point 2", ...],
  "bull_case": "Detailed bull case",
  "bear_case": "Detailed bear case",
  "technical_outlook": "Technical analysis summary",
  "fundamental_outlook": "Fundamental analysis summary",
  "catalysts": ["Catalyst 1", "Catalyst 2", ...],
  "risks": ["Risk 1", "Risk 2", ...],
  "price_target": 150.00 or null,
  "recommendation": "BUY" or "HOLD" or "SELL",
  "confidence": 85
}`;

    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        messages: [{ role: 'user', content: prompt }]
      });
      
      const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
      const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      
      return {
        ticker,
        company_name: parsed.company_name,
        analysis: parsed.analysis,
        key_points: parsed.key_points,
        bull_case: parsed.bull_case,
        bear_case: parsed.bear_case,
        technical_outlook: parsed.technical_outlook,
        fundamental_outlook: parsed.fundamental_outlook,
        catalysts: parsed.catalysts,
        risks: parsed.risks,
        price_target: parsed.price_target,
        recommendation: parsed.recommendation,
        confidence: parsed.confidence,
        generated_at: new Date()
      };
      
    } catch (error) {
      console.error('Deep dive generation failed:', error);
      throw error;
    }
  }
  
  /**
   * Identify historical patterns in current market (with caching)
   */
  async generatePatternWatch(): Promise<PatternMatch[]> {
    console.log('🔍 Generating Pattern Watch...');
    
    // Check cache first
    const cached = await this.getCachedPatterns();
    if (cached) {
      console.log('  ✓ Using cached patterns');
      return cached;
    }
    
    console.log('  ✓ Generating new patterns...');
    
    // Get recent high-priority entries
    const entries = await this.getRecentEntries(50, 70);
    
    const entriesSummary = entries.map(e => e.ai_summary).join('\n');
    
    const prompt = `You are a market historian. Analyze these current market events and identify 3-5 HISTORICAL PATTERNS they resemble.

CURRENT MARKET EVENTS:
${entriesSummary}

For each pattern:
1. Name the historical pattern
2. Describe what happened historically
3. Explain similarities to today
4. Rate similarity (70-100%)
5. Explain implications for markets
6. State what happened historically after

Focus on patterns from major market events: 2008 crisis, 2020 COVID, dot-com bubble, 1987 crash, oil crises, etc.

Respond with ONLY valid JSON (no markdown):
{
  "patterns": [
    {
      "pattern_name": "2021 Supply Chain Crisis",
      "description": "Global supply chain disruptions from pandemic",
      "historical_context": "Container shortages, port congestion, semiconductor shortage",
      "current_similarity": 85,
      "implications": "Expect continued inflation pressure and inventory challenges",
      "historical_outcome": "Markets corrected 15%, supply chains normalized after 18 months"
    }
  ]
}`;

    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        messages: [{ role: 'user', content: prompt }]
      });
      
      const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
      const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      
      const patterns = parsed.patterns;
      
      // Cache the result
      await this.cachePatterns(patterns);
      console.log('  ✓ Cached patterns');
      
      return patterns;
      
    } catch (error) {
      console.error('Pattern watch generation failed:', error);
      return [];
    }
  }
  
  /**
   * Get cached patterns (today only)
   */
  private async getCachedPatterns(): Promise<PatternMatch[] | null> {
    try {
      const result = await pool.query(`
        SELECT patterns FROM pattern_watch_cache
        WHERE created_date = CURRENT_DATE
        LIMIT 1
      `);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0].patterns;
    } catch (error) {
      console.error('Error fetching cached patterns:', error);
      return null;
    }
  }
  
  /**
   * Cache patterns in database
   */
  private async cachePatterns(patterns: PatternMatch[]): Promise<void> {
    try {
      await pool.query(`
        INSERT INTO pattern_watch_cache (patterns)
        VALUES ($1)
        ON CONFLICT (created_date) DO NOTHING
      `, [JSON.stringify(patterns)]);
    } catch (error) {
      console.error('Error caching patterns:', error);
    }
  }
  
  /**
   * Assess current market risks (with caching)
   */
  async generateRiskMonitor(): Promise<RiskAssessment> {
    console.log('⚠️ Generating Risk Monitor...');
    
    // Check cache first
    const cached = await this.getCachedRiskAssessment();
    if (cached) {
      console.log('  ✓ Using cached risk assessment');
      return cached;
    }
    
    console.log('  ✓ Generating new risk assessment...');
    
    const entries = await this.getRecentEntries(50, 60);
    const entriesSummary = entries.map(e => e.ai_summary).join('\n');
    
    const prompt = `You are a risk management analyst. Assess current market risks based on these events:

${entriesSummary}

Provide comprehensive risk assessment including:
1. Overall risk level (low/medium/high/extreme)
2. Risk score (0-100)
3. Top 5 specific risks with severity/probability/impact
4. Market indicators assessment
5. Risk mitigation recommendations

Respond with ONLY valid JSON (no markdown):
{
  "overall_risk_level": "medium",
  "risk_score": 65,
  "top_risks": [
    {
      "category": "Geopolitical",
      "description": "Trade tensions escalating",
      "severity": "high",
      "probability": "medium",
      "impact": "Market volatility, supply chain disruption"
    }
  ],
  "market_indicators": {
    "volatility": "elevated",
    "sentiment": "cautious",
    "technical": "neutral"
  },
  "recommendations": ["Diversify internationally", "Hedge with options"]
}`;

    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      });
      
      const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
      const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      
      // Cache the result
      await this.cacheRiskAssessment(parsed);
      console.log('  ✓ Cached risk assessment');
      
      return parsed;
      
    } catch (error) {
      console.error('Risk monitor generation failed:', error);
      throw error;
    }
  }
  
  /**
   * Get cached risk assessment (today only)
   */
  private async getCachedRiskAssessment(): Promise<RiskAssessment | null> {
    try {
      const result = await pool.query(`
        SELECT * FROM risk_monitor_cache
        WHERE created_date = CURRENT_DATE
        LIMIT 1
      `);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return {
        overall_risk_level: row.overall_risk_level,
        risk_score: row.risk_score,
        top_risks: row.top_risks,
        market_indicators: row.market_indicators,
        recommendations: row.recommendations
      };
    } catch (error) {
      console.error('Error fetching cached risk assessment:', error);
      return null;
    }
  }
  
  /**
   * Cache risk assessment in database
   */
  private async cacheRiskAssessment(assessment: any): Promise<void> {
    try {
      await pool.query(`
        INSERT INTO risk_monitor_cache (
          overall_risk_level, risk_score, top_risks, market_indicators, recommendations
        ) VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (created_date) DO NOTHING
      `, [
        assessment.overall_risk_level,
        assessment.risk_score,
        JSON.stringify(assessment.top_risks),
        JSON.stringify(assessment.market_indicators),
        JSON.stringify(assessment.recommendations)
      ]);
    } catch (error) {
      console.error('Error caching risk assessment:', error);
    }
  }
  
  /**
   * Generate political intelligence briefing
   */
  async generatePoliticalIntelligence(): Promise<PoliticalIntelligence> {
    console.log('🏛️ Generating Political Intelligence...');
    
    const entries = await this.getRecentEntries(30, 60);
    const entriesSummary = entries.map(e => e.ai_summary).join('\n');
    
    const prompt = `You are a policy analyst. Analyze political/policy developments and their market impact:

${entriesSummary}

Provide:
1. Executive summary
2. Key political developments with market impact
3. Policy changes affecting markets
4. Geopolitical risks
5. Investment opportunities from policy shifts

Respond with ONLY valid JSON (no markdown):
{
  "summary": "Brief overview of political landscape",
  "key_developments": [
    {
      "event": "Tariff announcement",
      "impact": "Inflationary pressure on consumer goods",
      "affected_sectors": ["retail", "manufacturing"],
      "timeframe": "immediate"
    }
  ],
  "policy_changes": ["Tax reform proposal", "Infrastructure bill"],
  "geopolitical_risks": ["Trade tensions", "Regional conflicts"],
  "opportunities": ["Defense contractors", "Renewable energy"]
}`;

    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      });
      
      const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
      const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      
      return parsed;
      
    } catch (error) {
      console.error('Political intelligence generation failed:', error);
      throw error;
    }
  }
  
  /**
   * Get recent entries
   */
  private async getRecentEntries(limit: number, minRelevance: number): Promise<any[]> {
    const result = await pool.query(`
      SELECT ai_summary, ai_relevance_score, source_name
      FROM digest_entries
      WHERE event_date >= NOW() - INTERVAL '48 hours'
        AND ai_relevance_score >= $2
      ORDER BY ai_relevance_score DESC
      LIMIT $1
    `, [limit, minRelevance]);
    
    return result.rows;
  }
  
  /**
   * Generate pattern analysis for specific ticker
   */
  async generateTickerPatterns(ticker: string): Promise<PatternMatch[]> {
    console.log(`🔍 Generating Pattern Watch for ${ticker}...`);
    
    ticker = ticker.toUpperCase();
    
    // Get entries about this ticker
    const entries = await this.getTickerRelevantEntries(ticker);
    
    if (entries.length === 0) {
      console.log(`  ⚠️ No entries found for ${ticker}`);
      return [];
    }
    
    const entriesSummary = entries.map(e => e.ai_summary).join('\n');
    
    const prompt = `You are a market historian. Analyze current events about ${ticker} and identify 3-5 HISTORICAL PATTERNS they resemble.

CURRENT EVENTS ABOUT ${ticker}:
${entriesSummary}

For each pattern:
1. Name the historical pattern (focus on patterns that affected similar companies/sectors)
2. Describe what happened historically
3. Explain similarities to ${ticker}'s current situation
4. Rate similarity (70-100%)
5. Explain implications specifically for ${ticker}
6. State what happened historically after

Focus on patterns from major events that affected similar companies: tech bubbles, sector rotations, regulatory changes, market corrections, etc.

Respond with ONLY valid JSON (no markdown):
{
  "patterns": [
    {
      "pattern_name": "2021 EV Bubble",
      "description": "Massive valuation expansion in EV sector",
      "historical_context": "EV stocks surged 300-500% on future promises",
      "current_similarity": 85,
      "implications": "Expect volatility and potential valuation reset for ${ticker}",
      "historical_outcome": "Many EV stocks corrected 60-80% over 12 months"
    }
  ]
}`;

    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        messages: [{ role: 'user', content: prompt }]
      });
      
      const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
      const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      
      return parsed.patterns || [];
      
    } catch (error) {
      console.error(`Pattern generation failed for ${ticker}:`, error);
      return [];
    }
  }
  
  /**
   * Generate risk assessment for specific ticker
   */
  async generateTickerRisks(ticker: string): Promise<any> {
    console.log(`⚠️ Generating Risk Monitor for ${ticker}...`);
    
    ticker = ticker.toUpperCase();
    
    const entries = await this.getTickerRelevantEntries(ticker);
    
    if (entries.length === 0) {
      console.log(`  ⚠️ No entries found for ${ticker}`);
      return null;
    }
    
    const entriesSummary = entries.map(e => e.ai_summary).join('\n');
    
    const prompt = `You are a risk analyst. Assess risks specifically affecting ${ticker} based on these events:

EVENTS AFFECTING ${ticker}:
${entriesSummary}

Provide comprehensive risk assessment specifically for ${ticker} including:
1. Overall risk level for investing in ${ticker} (low/medium/high/extreme)
2. Risk score (0-100) specific to ${ticker}
3. Top 5 specific risks affecting ${ticker} with severity/probability/impact
4. ${ticker}'s positioning relative to these risks
5. Risk mitigation recommendations for ${ticker} investors

Respond with ONLY valid JSON (no markdown):
{
  "ticker": "${ticker}",
  "overall_risk_level": "medium",
  "risk_score": 65,
  "top_risks": [
    {
      "category": "Regulatory",
      "description": "How this affects ${ticker} specifically",
      "severity": "high",
      "probability": "medium",
      "impact": "Impact on ${ticker}'s business/valuation"
    }
  ],
  "market_indicators": {
    "volatility": "elevated",
    "sentiment": "cautious",
    "technical": "neutral"
  },
  "recommendations": ["Specific advice for ${ticker} investors"]
}`;

    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      });
      
      const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
      const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      
      return parsed;
      
    } catch (error) {
      console.error(`Risk generation failed for ${ticker}:`, error);
      return null;
    }
  }
}

export default new DeepDiveService();
