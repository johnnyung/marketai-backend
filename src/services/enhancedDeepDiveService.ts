// backend/src/services/enhancedDeepDiveService.ts
// Comprehensive 2000+ Word Deep Dive Analysis with Caching

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
  companyName: string;
  
  // Core sections (2000+ words total)
  executiveSummary: string;          // 200 words
  businessModel: string;             // 300 words
  competitiveLandscape: string;      // 400 words
  financialAnalysis: string;         // 300 words
  riskAssessment: string;            // 300 words
  historicalPatterns: string;        // 300 words
  investmentThesis: string;          // 200 words
  
  // Enhanced details
  bullCase: {
    title: string;
    points: Array<{
      point: string;
      explanation: string;
      strength: 'HIGH' | 'MEDIUM' | 'LOW';
    }>;
  };
  
  bearCase: {
    title: string;
    points: Array<{
      point: string;
      explanation: string;
      severity: 'HIGH' | 'MEDIUM' | 'LOW';
    }>;
  };
  
  catalysts: {
    nearTerm: Array<{ event: string; timing: string; impact: string; }>;
    mediumTerm: Array<{ event: string; timing: string; impact: string; }>;
    longTerm: Array<{ event: string; timing: string; impact: string; }>;
  };
  
  riskFactors: {
    operational: string[];
    financial: string[];
    market: string[];
    regulatory: string[];
  };
  
  historicalComparisons: Array<{
    company: string;
    scenario: string;
    outcome: string;
    relevance: string;
  }>;
  
  competitiveMatrix: Array<{
    competitor: string;
    strength: string;
    weakness: string;
    marketPosition: string;
  }>;
  
  recommendation: 'STRONG BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG SELL';
  confidence: number;
  priceTarget: number | null;
  timeHorizon: string;
  
  generatedAt: Date;
}

class EnhancedDeepDiveService {
  
  /**
   * Generate comprehensive deep dive (WITH CACHING)
   */
  async generateDeepDive(ticker: string): Promise<DeepDiveAnalysis> {
    console.log(`📊 Generating deep dive for ${ticker}...`);
    
    // CHECK CACHE FIRST
    const cached = await this.getCachedDeepDive(ticker);
    if (cached) {
      console.log(`  ✓ Using cached deep dive for ${ticker}`);
      await this.recordCacheHit('deep_dive');
      return cached;
    }
    
    console.log(`  ✓ No cache found, generating new analysis...`);
    await this.recordCacheMiss('deep_dive');
    
    try {
      // Gather all intelligence
      const intelligence = await this.gatherIntelligence(ticker);
      console.log(`  ✓ Gathered ${intelligence.entries.length} entries, ${intelligence.threads.length} threads`);
      
      // Generate comprehensive analysis
      const analysis = await this.generateComprehensiveAnalysis(ticker, intelligence);
      console.log(`  ✓ Generated ${this.countWords(analysis)} word analysis`);
      
      // Cache it
      await this.cacheDeepDive(ticker, analysis);
      console.log(`  ✓ Cached deep dive for ${ticker}`);
      
      return analysis;
      
    } catch (error: any) {
      console.error(`❌ Deep dive failed for ${ticker}:`, error.message);
      return this.getFallbackAnalysis(ticker);
    }
  }

  /**
   * Get cached deep dive (today only)
   */
  private async getCachedDeepDive(ticker: string): Promise<DeepDiveAnalysis | null> {
    try {
      const result = await pool.query(`
        SELECT 
          ticker,
          company_name,
          analysis,
          key_points,
          bull_case,
          bear_case,
          catalysts,
          risks,
          recommendation,
          confidence,
          created_date as generated_at
        FROM deep_dive_cache
        WHERE ticker = $1 
          AND created_date = CURRENT_DATE
        LIMIT 1
      `, [ticker.toUpperCase()]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      
      // Parse the stored JSON analysis
      const analysisData = typeof row.analysis === 'string' 
        ? JSON.parse(row.analysis) 
        : row.analysis;
      
      return {
        ticker: row.ticker,
        companyName: row.company_name || ticker,
        ...analysisData,
        generatedAt: new Date(row.generated_at)
      };
    } catch (error) {
      console.error('Error fetching cached deep dive:', error);
      return null;
    }
  }

  /**
   * Cache deep dive in database
   */
  private async cacheDeepDive(ticker: string, analysis: DeepDiveAnalysis): Promise<void> {
    try {
      await pool.query(`
        INSERT INTO deep_dive_cache (
          ticker,
          company_name,
          analysis,
          key_points,
          bull_case,
          bear_case,
          catalysts,
          risks,
          recommendation,
          confidence
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (ticker, created_date) DO UPDATE
        SET 
          company_name = EXCLUDED.company_name,
          analysis = EXCLUDED.analysis,
          key_points = EXCLUDED.key_points,
          bull_case = EXCLUDED.bull_case,
          bear_case = EXCLUDED.bear_case,
          catalysts = EXCLUDED.catalysts,
          risks = EXCLUDED.risks,
          recommendation = EXCLUDED.recommendation,
          confidence = EXCLUDED.confidence,
          created_date = NOW()
      `, [
        ticker.toUpperCase(),
        analysis.companyName,
        JSON.stringify(analysis),
        JSON.stringify([analysis.executiveSummary]),
        analysis.bullCase.title,
        analysis.bearCase.title,
        JSON.stringify(analysis.catalysts),
        JSON.stringify(analysis.riskFactors),
        analysis.recommendation,
        analysis.confidence
      ]);
    } catch (error) {
      console.error('Error caching deep dive:', error);
    }
  }

  /**
   * Record cache hit for statistics
   */
  private async recordCacheHit(cacheType: string): Promise<void> {
    try {
      await pool.query(`
        INSERT INTO cache_statistics (cache_type, hits, api_calls_saved, cost_saved_dollars)
        VALUES ($1, 1, 1, 0.10)
        ON CONFLICT (cache_type, date) DO UPDATE
        SET 
          hits = cache_statistics.hits + 1,
          api_calls_saved = cache_statistics.api_calls_saved + 1,
          cost_saved_dollars = cache_statistics.cost_saved_dollars + 0.10
      `, [cacheType]);
    } catch (error) {
      // Silently fail
    }
  }

  /**
   * Record cache miss for statistics
   */
  private async recordCacheMiss(cacheType: string): Promise<void> {
    try {
      await pool.query(`
        INSERT INTO cache_statistics (cache_type, misses)
        VALUES ($1, 1)
        ON CONFLICT (cache_type, date) DO UPDATE
        SET misses = cache_statistics.misses + 1
      `, [cacheType]);
    } catch (error) {
      // Silently fail
    }
  }

  /**
   * Gather intelligence about ticker
   */
  private async gatherIntelligence(ticker: string) {
    const companyNames = this.getCompanyVariations(ticker);
    
    const nameConditions = companyNames.map((_, i) => 
      `ai_summary ILIKE '%' || $${i + 2} || '%'`
    ).join(' OR ');
    
    // Get digest entries
    const entriesQuery = `
      SELECT 
        source_name,
        ai_summary,
        ai_relevance_score,
        ai_sentiment,
        event_date
      FROM digest_entries
      WHERE event_date >= NOW() - INTERVAL '60 days'
        AND (
          ai_entities_tickers @> to_jsonb(ARRAY[$1]::text[])
          OR ${nameConditions}
        )
      ORDER BY ai_relevance_score DESC, event_date DESC
      LIMIT 100
    `;
    
    const entriesResult = await pool.query(entriesQuery, [ticker, ...companyNames]);
    
    // Get intelligence threads
    const threadsQuery = `
      SELECT 
        thread_name,
        description,
        ai_insight,
        ai_trading_implication,
        ai_risk_factors
      FROM intelligence_threads
      WHERE status = 'ACTIVE'
        AND (
          affected_tickers::text ILIKE '%' || $1 || '%'
          OR ai_insight ILIKE '%' || $1 || '%'
        )
      LIMIT 20
    `;
    
    const threadsResult = await pool.query(threadsQuery, [ticker]);
    
    return {
      entries: entriesResult.rows,
      threads: threadsResult.rows
    };
  }

  /**
   * Get company name variations
   */
  private getCompanyVariations(ticker: string): string[] {
    const variations: Record<string, string[]> = {
      'NVDA': ['Nvidia', 'NVIDIA'],
      'TSLA': ['Tesla'],
      'AAPL': ['Apple'],
      'MSFT': ['Microsoft'],
      'GOOGL': ['Google', 'Alphabet'],
      'AMZN': ['Amazon'],
      'META': ['Meta', 'Facebook'],
      'NFLX': ['Netflix'],
      'AMD': ['AMD', 'Advanced Micro Devices'],
      'PLTR': ['Palantir'],
      'MRK': ['Merck'],
      'LLY': ['Eli Lilly', 'Lilly'],
      'NVO': ['Novo Nordisk'],
      'UPS': ['UPS', 'United Parcel'],
      'FDX': ['FedEx'],
      'ACHR': ['Archer Aviation', 'Archer'],
      'JOBY': ['Joby Aviation', 'Joby']
    };
    
    return variations[ticker] || [ticker];
  }

  /**
   * Generate comprehensive 2000+ word analysis with AI
   */
  private async generateComprehensiveAnalysis(ticker: string, intelligence: any): Promise<DeepDiveAnalysis> {
    const entriesContext = intelligence.entries.slice(0, 50).map((e: any) =>
      `[${e.ai_relevance_score}] ${e.source_name}: ${e.ai_summary}`
    ).join('\n');
    
    const threadsContext = intelligence.threads.map((t: any) =>
      `${t.thread_name}: ${t.ai_insight}`
    ).join('\n');
    
    const prompt = `You are a senior equity analyst creating a COMPREHENSIVE 2000+ word deep dive analysis on ${ticker}.

INTELLIGENCE DATA:
${entriesContext}

MARKET THEMES:
${threadsContext}

Create an exhaustive, institutional-quality analysis covering:

1. EXECUTIVE SUMMARY (200 words)
   - Company overview
   - Current market position
   - Key investment highlights
   - Overall assessment

2. BUSINESS MODEL DEEP DIVE (300 words)
   - Core revenue streams
   - Business strategy
   - Competitive advantages
   - Growth drivers

3. COMPETITIVE LANDSCAPE (400 words)
   - Market structure
   - Key competitors analysis
   - Market share dynamics
   - Competitive positioning
   - Moats and defensibility

4. FINANCIAL ANALYSIS (300 words)
   - Revenue trends
   - Profitability metrics
   - Cash flow analysis
   - Balance sheet health
   - Financial outlook

5. RISK ASSESSMENT (300 words)
   - Operational risks
   - Financial risks
   - Market risks
   - Regulatory/political risks
   - Mitigation strategies

6. HISTORICAL PATTERNS (300 words)
   - Similar company comparisons
   - Historical precedents
   - Pattern recognition
   - Lessons from history

7. INVESTMENT THESIS (200 words)
   - Core investment rationale
   - Expected returns
   - Time horizon
   - Key assumptions

Additionally provide:
- BULL CASE: 5+ detailed points with explanations
- BEAR CASE: 5+ detailed points with explanations
- CATALYSTS: Near-term, medium-term, long-term
- RISK FACTORS: Categorized by type
- HISTORICAL COMPARISONS: Similar scenarios
- COMPETITIVE MATRIX: vs competitors
- RECOMMENDATION: Strong Buy/Buy/Hold/Sell/Strong Sell
- CONFIDENCE: 0-100
- PRICE TARGET: if applicable
- TIME HORIZON: investment timeframe

Be thorough, specific, and data-driven. Exceed 2000 words total.

Respond with ONLY valid JSON:
{
  "companyName": "Full company name",
  "executiveSummary": "200 word summary",
  "businessModel": "300 word analysis",
  "competitiveLandscape": "400 word analysis",
  "financialAnalysis": "300 word analysis",
  "riskAssessment": "300 word analysis",
  "historicalPatterns": "300 word analysis",
  "investmentThesis": "200 word thesis",
  "bullCase": {
    "title": "Bull Case Summary",
    "points": [
      {
        "point": "Point title",
        "explanation": "Detailed explanation",
        "strength": "HIGH"
      }
    ]
  },
  "bearCase": {
    "title": "Bear Case Summary",
    "points": [
      {
        "point": "Point title",
        "explanation": "Detailed explanation",
        "severity": "HIGH"
      }
    ]
  },
  "catalysts": {
    "nearTerm": [{"event": "", "timing": "", "impact": ""}],
    "mediumTerm": [{"event": "", "timing": "", "impact": ""}],
    "longTerm": [{"event": "", "timing": "", "impact": ""}]
  },
  "riskFactors": {
    "operational": ["risk1", "risk2"],
    "financial": ["risk1", "risk2"],
    "market": ["risk1", "risk2"],
    "regulatory": ["risk1", "risk2"]
  },
  "historicalComparisons": [
    {
      "company": "Similar company",
      "scenario": "What happened",
      "outcome": "Result",
      "relevance": "Why it matters"
    }
  ],
  "competitiveMatrix": [
    {
      "competitor": "Name",
      "strength": "Their advantage",
      "weakness": "Their disadvantage",
      "marketPosition": "Relative position"
    }
  ],
  "recommendation": "BUY",
  "confidence": 75,
  "priceTarget": 150.00,
  "timeHorizon": "12 months"
}`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16000,
      messages: [{ role: 'user', content: prompt }]
    });
    
    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    
    return {
      ticker: ticker.toUpperCase(),
      ...parsed,
      generatedAt: new Date()
    };
  }

  /**
   * Count words in analysis
   */
  private countWords(analysis: DeepDiveAnalysis): number {
    const text = [
      analysis.executiveSummary,
      analysis.businessModel,
      analysis.competitiveLandscape,
      analysis.financialAnalysis,
      analysis.riskAssessment,
      analysis.historicalPatterns,
      analysis.investmentThesis
    ].join(' ');
    
    return text.split(/\s+/).length;
  }

  /**
   * Fallback analysis
   */
  private getFallbackAnalysis(ticker: string): DeepDiveAnalysis {
    return {
      ticker: ticker.toUpperCase(),
      companyName: ticker,
      executiveSummary: 'Comprehensive analysis is currently being generated. Please try again in a moment.',
      businessModel: 'Analysis pending.',
      competitiveLandscape: 'Analysis pending.',
      financialAnalysis: 'Analysis pending.',
      riskAssessment: 'Analysis pending.',
      historicalPatterns: 'Analysis pending.',
      investmentThesis: 'Analysis pending.',
      bullCase: { title: 'Pending', points: [] },
      bearCase: { title: 'Pending', points: [] },
      catalysts: { nearTerm: [], mediumTerm: [], longTerm: [] },
      riskFactors: { operational: [], financial: [], market: [], regulatory: [] },
      historicalComparisons: [],
      competitiveMatrix: [],
      recommendation: 'HOLD',
      confidence: 0,
      priceTarget: null,
      timeHorizon: 'Pending',
      generatedAt: new Date()
    };
  }
}

export default new EnhancedDeepDiveService();
