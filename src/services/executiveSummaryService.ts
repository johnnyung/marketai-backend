import { pool } from "../db/index.js";
// backend/src/services/executiveSummaryService.ts
// AI-Generated Executive Summary - Daily market intelligence synthesis

import Anthropic from '@anthropic-ai/sdk';
import { Pool } from 'pg';


const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY
});

interface ExecutiveSummary {
  marketDirective: 'AGGRESSIVE_BUYING' | 'SELECTIVE_BUYING' | 'HOLD' | 'DEFENSIVE' | 'SELL';
  directiveReasoning: string;
  topThemes: Array<{
    theme: string;
    description: string;
    impact: string;
  }>;
  topOpportunities: Array<{
    ticker: string;
    reasoning: string;
    timeframe: string;
    confidence: number;
  }>;
  keyRisks: string[];
  watchTomorrow: Array<{
    event: string;
    importance: 'HIGH' | 'MEDIUM' | 'LOW';
    impact: string;
  }>;
  generatedAt: Date;
}

class ExecutiveSummaryService {
  private cache: ExecutiveSummary | null = null;
  private cacheDate: string | null = null;

  /**
   * Get today's executive summary (cached)
   */
  async getExecutiveSummary(): Promise<ExecutiveSummary> {
    const today = new Date().toISOString().split('T')[0];
    
    // Return cache if available for today
    if (this.cache && this.cacheDate === today) {
      console.log('📊 Returning cached executive summary');
      return this.cache;
    }
    
    // Generate new summary
    console.log('📊 Generating new executive summary...');
    const summary = await this.generateExecutiveSummary();
    
    // Cache it
    this.cache = summary;
    this.cacheDate = today;
    
    return summary;
  }

  /**
   * Force regenerate executive summary
   */
  async regenerateExecutiveSummary(): Promise<ExecutiveSummary> {
    console.log('📊 Force regenerating executive summary...');
    const summary = await this.generateExecutiveSummary();
    
    // Update cache
    const today = new Date().toISOString().split('T')[0];
    this.cache = summary;
    this.cacheDate = today;
    
    return summary;
  }

  /**
   * Generate executive summary using AI
   */
  private async generateExecutiveSummary(): Promise<ExecutiveSummary> {
    try {
      // Get recent intelligence threads (HIGH impact only)
      const threads = await this.getHighImpactThreads();
      console.log(`  ✓ Found ${threads.length} high-impact threads`);
      
      // Get top digest entries
      const entries = await this.getTopDigestEntries();
      console.log(`  ✓ Found ${entries.length} top digest entries`);
      
      // Use AI to synthesize
      const summary = await this.synthesizeWithAI(threads, entries);
      console.log('  ✓ AI synthesis complete');
      
      return summary;
      
    } catch (error: any) {
      console.error('❌ Executive summary generation failed:', error.message);
      
      // Return fallback summary
      return this.getFallbackSummary();
    }
  }

  /**
   * Get high-impact intelligence threads
   */
  private async getHighImpactThreads() {
    const result = await pool.query(`
      SELECT 
        title,
        theme,
        impact_level,
        affected_tickers,
        ai_insight,
        ai_trading_implication,
        ai_risk_factors,
        entry_count
      FROM intelligence_threads
      WHERE status = 'ACTIVE'
        AND impact_level = 'HIGH'
      ORDER BY updated_at DESC
      LIMIT 10
    `);
    
    return result.rows;
  }

  /**
   * Get top digest entries (80+ relevance)
   */
  private async getTopDigestEntries() {
    const result = await pool.query(`
      SELECT 
        source_name,
        ai_summary,
        ai_relevance_score,
        ai_sentiment,
        ai_entities_tickers,
        event_date
      FROM digest_entries
      WHERE event_date >= NOW() - INTERVAL '48 hours'
        AND ai_relevance_score >= 80
      ORDER BY ai_relevance_score DESC
      LIMIT 30
    `);
    
    return result.rows;
  }

  /**
   * Synthesize with Claude AI
   */
  private async synthesizeWithAI(threads: any[], entries: any[]): Promise<ExecutiveSummary> {
    // Format threads for AI
    const threadsContext = threads.map(t => 
      `${t.thread_name} (${t.impact_level}): ${t.ai_insight} | Trade: ${t.ai_trading_implication}`
    ).join('\n');
    
    // Format entries for AI
    const entriesContext = entries.slice(0, 20).map(e =>
      `[${e.ai_relevance_score}] ${e.ai_summary} | Tickers: ${JSON.stringify(e.ai_entities_tickers || [])}`
    ).join('\n');
    
    const prompt = `You are a senior market strategist creating today's executive summary for institutional investors.

INTELLIGENCE THREADS (HIGH IMPACT):
${threadsContext}

TOP MARKET INTELLIGENCE:
${entriesContext}

Create a comprehensive executive summary with:

1. **Market Directive**: Choose ONE: AGGRESSIVE_BUYING, SELECTIVE_BUYING, HOLD, DEFENSIVE, or SELL
2. **Top 3 Themes**: The 3 most important market themes today
3. **Top 3 Opportunities**: Specific tickers with clear reasoning
4. **Key Risks**: 3-5 major risks to watch
5. **Watch Tomorrow**: Upcoming events with market impact

Be specific, actionable, and concise. Focus on what matters most.

Respond with ONLY valid JSON:
{
  "marketDirective": "SELECTIVE_BUYING" or "AGGRESSIVE_BUYING" or "HOLD" or "DEFENSIVE" or "SELL",
  "directiveReasoning": "One sentence explaining the directive",
  "topThemes": [
    {
      "theme": "Brief theme title",
      "description": "2-3 sentence explanation",
      "impact": "How this affects markets"
    }
  ],
  "topOpportunities": [
    {
      "ticker": "NVDA",
      "reasoning": "Why this is an opportunity now",
      "timeframe": "immediate" or "short-term" or "medium-term",
      "confidence": 70-100
    }
  ],
  "keyRisks": [
    "Specific risk factor 1",
    "Specific risk factor 2",
    "Specific risk factor 3"
  ],
  "watchTomorrow": [
    {
      "event": "Specific upcoming event",
      "importance": "HIGH" or "MEDIUM" or "LOW",
      "impact": "How this could move markets"
    }
  ]
}`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }]
    });
    
    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    
    return {
      ...parsed,
      generatedAt: new Date()
    };
  }

  /**
   * Fallback summary if AI fails
   */
  private getFallbackSummary(): ExecutiveSummary {
    return {
      marketDirective: 'HOLD',
      directiveReasoning: 'Awaiting more market data before making directional calls',
      topThemes: [
        {
          theme: 'Market Analysis Pending',
          description: 'Comprehensive market analysis is currently being generated. Please check back shortly.',
          impact: 'Neutral'
        }
      ],
      topOpportunities: [],
      keyRisks: [
        'Market volatility',
        'Economic uncertainty',
        'Geopolitical tensions'
      ],
      watchTomorrow: [],
      generatedAt: new Date()
    };
  }

  /**
   * Clear cache (for testing)
   */
  clearCache(): void {
    this.cache = null;
    this.cacheDate = null;
    console.log('🗑️ Executive summary cache cleared');
  }
}

export default new ExecutiveSummaryService();
