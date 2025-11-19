// backend/src/services/tickerVettingService.ts
// 20-Point Ticker Vetting with DATABASE CACHING

import Anthropic from '@anthropic-ai/sdk';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY
});

interface VettingScore {
  category: string;
  score: number;
  status: 'PASS' | 'WARNING' | 'FAIL';
  reasoning: string;
  keyFindings: string[];
}

interface VettingResult {
  ticker: string;
  overallScore: number;
  overallStatus: 'APPROVED' | 'CAUTION' | 'REJECTED';
  scores: VettingScore[];
  generatedAt: Date;
  summary: string;
}

const VETTING_CATEGORIES = [
  'Fundamentals',
  'Recent News & Events',
  'Competitive Position',
  'Management Quality',
  'Political & Regulatory',
  'Sector Dynamics',
  'Technical Position',
  'Institutional Activity',
  'Supply Chain Analysis',
  'Social & Alternative Data',
  'Historical Patterns',
  'Macro Factors',
  'Related Entity Analysis',
  'Executive Network',
  'Geopolitical Exposure',
  'ESG & Reputation',
  'Event Catalyst Calendar',
  'Valuation Context',
  'Options Market Signals',
  'Smart Money Indicators'
];

class TickerVettingService {
  
  /**
   * Comprehensive 20-point vetting for a ticker (WITH CACHING)
   */
  async vetTicker(ticker: string): Promise<VettingResult> {
    console.log(`🔍 Vetting ${ticker}...`);
    
    // CHECK CACHE FIRST
    const cached = await this.getCachedVetting(ticker);
    if (cached) {
      console.log(`  ✓ Using cached vetting for ${ticker}`);
      await this.recordCacheHit('vetting');
      return cached;
    }
    
    console.log(`  ✓ No cache found, generating new vetting...`);
    await this.recordCacheMiss('vetting');
    
    try {
      // Gather intelligence and analyze
      const intelligence = await this.gatherIntelligence(ticker);
      console.log(`  ✓ Gathered intelligence: ${intelligence.entries.length} entries, ${intelligence.threads.length} threads`);
      
      const vettingResult = await this.analyzeWithAI(ticker, intelligence);
      console.log(`  ✓ AI analysis complete. Overall score: ${vettingResult.overallScore}/100`);
      
      // CACHE THE RESULT
      await this.cacheVetting(ticker, vettingResult);
      console.log(`  ✓ Cached vetting for ${ticker}`);
      
      return vettingResult;
      
    } catch (error: any) {
      console.error(`❌ Vetting failed for ${ticker}:`, error.message);
      return this.getFallbackVetting(ticker);
    }
  }

  /**
   * Get cached vetting (today only)
   */
  private async getCachedVetting(ticker: string): Promise<VettingResult | null> {
    try {
      const result = await pool.query(`
        SELECT 
          ticker,
          overall_score,
          overall_status,
          scores,
          summary,
          generated_at
        FROM ticker_vetting_cache
        WHERE ticker = $1 
          AND created_date = CURRENT_DATE
        LIMIT 1
      `, [ticker.toUpperCase()]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return {
        ticker: row.ticker,
        overallScore: row.overall_score,
        overallStatus: row.overall_status,
        scores: row.scores,
        summary: row.summary,
        generatedAt: new Date(row.generated_at)
      };
    } catch (error) {
      console.error('Error fetching cached vetting:', error);
      return null;
    }
  }

  /**
   * Cache vetting result in database
   */
  private async cacheVetting(ticker: string, result: VettingResult): Promise<void> {
    try {
      await pool.query(`
        INSERT INTO ticker_vetting_cache (
          ticker,
          overall_score,
          overall_status,
          scores,
          summary
        ) VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (ticker, created_date) DO UPDATE
        SET 
          overall_score = EXCLUDED.overall_score,
          overall_status = EXCLUDED.overall_status,
          scores = EXCLUDED.scores,
          summary = EXCLUDED.summary,
          generated_at = NOW()
      `, [
        ticker.toUpperCase(),
        result.overallScore,
        result.overallStatus,
        JSON.stringify(result.scores),
        result.summary
      ]);
    } catch (error) {
      console.error('Error caching vetting:', error);
      // Don't fail if caching fails
    }
  }

  /**
   * Record cache hit for statistics
   */
  private async recordCacheHit(cacheType: string): Promise<void> {
    try {
      await pool.query(`
        INSERT INTO cache_statistics (cache_type, hits, api_calls_saved, cost_saved_dollars)
        VALUES ($1, 1, 1, 0.15)
        ON CONFLICT (cache_type, date) DO UPDATE
        SET 
          hits = cache_statistics.hits + 1,
          api_calls_saved = cache_statistics.api_calls_saved + 1,
          cost_saved_dollars = cache_statistics.cost_saved_dollars + 0.15
      `, [cacheType]);
    } catch (error) {
      // Silently fail stats recording
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
      // Silently fail stats recording
    }
  }

  /**
   * Gather all relevant intelligence about ticker
   */
  private async gatherIntelligence(ticker: string) {
    const companyNames = this.getCompanyVariations(ticker);
    
    // Build OR conditions for company name matching
    const nameConditions = companyNames.map((_, i) => 
      `ai_summary ILIKE '%' || $${i + 2} || '%'`
    ).join(' OR ');
    
    // Get digest entries mentioning ticker
    const entriesQuery = `
      SELECT 
        source_name,
        ai_summary,
        ai_relevance_score,
        ai_sentiment,
        event_date
      FROM digest_entries
      WHERE event_date >= NOW() - INTERVAL '30 days'
        AND (
          ai_entities_tickers @> to_jsonb(ARRAY[$1]::text[])
          OR ${nameConditions}
        )
      ORDER BY ai_relevance_score DESC, event_date DESC
      LIMIT 50
    `;
    
    const entriesResult = await pool.query(entriesQuery, [ticker, ...companyNames]);
    
    // Get intelligence threads mentioning ticker
    const threadsQuery = `
      SELECT 
        title,
        theme,
        affected_tickers,
        ai_insight,
        ai_trading_implication,
        ai_risk_factors
      FROM intelligence_threads
      WHERE status = 'ACTIVE'
        AND (
          affected_tickers::text ILIKE '%' || $1 || '%'
          OR ai_insight ILIKE '%' || $1 || '%'
        )
      LIMIT 10
    `;
    
    const threadsResult = await pool.query(threadsQuery, [ticker]);
    
    return {
      entries: entriesResult.rows,
      threads: threadsResult.rows
    };
  }

  /**
   * Get company name variations for better matching
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
   * Analyze ticker with AI across all 20 dimensions
   */
  private async analyzeWithAI(ticker: string, intelligence: any): Promise<VettingResult> {
    // Format intelligence for AI
    const entriesContext = intelligence.entries.slice(0, 30).map((e: any) =>
      `[${e.ai_relevance_score}] ${e.source_name}: ${e.ai_summary} (${e.ai_sentiment || 'neutral'})`
    ).join('\n');
    
    const threadsContext = intelligence.threads.map((t: any) =>
      `${t.thread_name}: ${t.ai_insight} | Trade: ${t.ai_trading_implication}`
    ).join('\n');
    
    const prompt = `You are a senior equity analyst conducting a comprehensive 20-point vetting analysis on ${ticker}.

RECENT INTELLIGENCE:
${entriesContext}

RELATED THREADS:
${threadsContext}

Analyze ${ticker} across ALL 20 dimensions listed below. For each dimension, provide:
1. A score (0-100, where 70+ = PASS, 50-69 = WARNING, <50 = FAIL)
2. Brief reasoning (1-2 sentences)
3. 1-3 key findings

THE 20 VETTING DIMENSIONS:
1. Fundamentals (revenue, margins, cash flow, balance sheet)
2. Recent News & Events (last 7-30 days developments)
3. Competitive Position (market share, competitive moats)
4. Management Quality (leadership, track record, execution)
5. Political & Regulatory (policy risks, regulatory environment)
6. Sector Dynamics (industry health, trends, cycles)
7. Technical Position (chart patterns, support/resistance)
8. Institutional Activity (smart money buying/selling)
9. Supply Chain Analysis (dependencies, vulnerabilities)
10. Social & Alternative Data (sentiment, buzz, retail interest)
11. Historical Patterns (similar setups, outcomes)
12. Macro Factors (interest rates, inflation impact)
13. Related Entity Analysis (partners, customers, suppliers)
14. Executive Network (insider connections, board quality)
15. Geopolitical Exposure (international risks, trade)
16. ESG & Reputation (sustainability, PR, controversies)
17. Event Catalyst Calendar (upcoming earnings, events)
18. Valuation Context (PE, multiples vs peers)
19. Options Market Signals (unusual activity, positioning)
20. Smart Money Indicators (13F filings, hedge fund activity)

Be objective and thorough. Use available intelligence but acknowledge when data is limited.

Respond with ONLY valid JSON:
{
  "overallScore": 0-100,
  "overallStatus": "APPROVED" or "CAUTION" or "REJECTED",
  "summary": "2-3 sentence overall assessment",
  "scores": [
    {
      "category": "Fundamentals",
      "score": 85,
      "status": "PASS" or "WARNING" or "FAIL",
      "reasoning": "Brief explanation",
      "keyFindings": ["Finding 1", "Finding 2"]
    }
  ]
}`;

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
      overallScore: parsed.overallScore,
      overallStatus: parsed.overallStatus,
      scores: parsed.scores,
      summary: parsed.summary,
      generatedAt: new Date()
    };
  }

  /**
   * Fallback vetting if AI fails
   */
  private getFallbackVetting(ticker: string): VettingResult {
    const fallbackScores: VettingScore[] = VETTING_CATEGORIES.map(category => ({
      category,
      score: 50,
      status: 'WARNING' as const,
      reasoning: 'Insufficient data for comprehensive analysis',
      keyFindings: ['Analysis pending']
    }));
    
    return {
      ticker,
      overallScore: 50,
      overallStatus: 'CAUTION',
      scores: fallbackScores,
      summary: 'Comprehensive vetting analysis is pending. Limited data available for full assessment.',
      generatedAt: new Date()
    };
  }

  /**
   * Quick vetting (top 5 most important checks only)
   */
  async quickVet(ticker: string): Promise<VettingResult> {
    console.log(`⚡ Quick vetting for ${ticker}...`);
    
    // Check cache first
    const cached = await this.getCachedVetting(ticker);
    if (cached) {
      console.log(`  ✓ Using cached quick vet for ${ticker}`);
      // Filter to top 5 for quick vet
      cached.scores = cached.scores.slice(0, 5);
      return cached;
    }
    
    try {
      const intelligence = await this.gatherIntelligence(ticker);
      
      // Full analysis but will only show top 5
      const result = await this.analyzeWithAI(ticker, intelligence);
      
      // Cache the full result
      await this.cacheVetting(ticker, result);
      
      // Return top 5 for quick vet
      result.scores = result.scores.slice(0, 5);
      
      return result;
      
    } catch (error: any) {
      console.error(`Quick vet failed for ${ticker}:`, error.message);
      return this.getFallbackVetting(ticker);
    }
  }

  /**
   * Batch vet multiple tickers (with caching)
   */
  async batchVet(tickers: string[]): Promise<Map<string, VettingResult>> {
    console.log(`🔍 Batch vetting ${tickers.length} tickers...`);
    
    const results = new Map<string, VettingResult>();
    
    for (const ticker of tickers) {
      try {
        const result = await this.vetTicker(ticker);
        results.set(ticker, result);
        
        // Small delay to avoid rate limiting
        await this.sleep(2000);
      } catch (error) {
        console.error(`Batch vet failed for ${ticker}`);
      }
    }
    
    return results;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default new TickerVettingService();
