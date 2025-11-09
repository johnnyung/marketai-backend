// backend/src/services/tradingOpportunitiesService.ts
// AI-Generated Trading Signals from Intelligence Digest

import Anthropic from '@anthropic-ai/sdk';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY
});

interface TradingSignal {
  ticker: string;
  action: 'BUY' | 'SELL' | 'WATCH';
  priceTarget: number | null;
  currentPrice: number | null;
  confidence: number; // 0-100
  riskReward: number; // e.g., 3.2 means 3.2:1 ratio
  reasoning: string;
  catalysts: string[];
  timeframe: string; // 'immediate', 'short-term', 'medium-term'
  supportingEntries: number; // Count of digest entries supporting this
}

class TradingOpportunitiesService {
  
  /**
   * Generate trading signals from recent high-priority digest entries
   */
  async generateTradingSignals(limit: number = 5): Promise<TradingSignal[]> {
    console.log('🎯 Generating trading signals...');
    
    // Get high-priority entries with tickers from last 48 hours
    const entries = await this.getRelevantEntries();
    console.log(`  ✓ Found ${entries.length} relevant entries with tickers`);
    
    if (entries.length === 0) {
      console.log('  ⚠️ No entries with tickers found');
      return [];
    }
    
    // Generate AI signals
    const signals = await this.generateAISignals(entries, limit);
    console.log(`  ✓ Generated ${signals.length} trading signals`);
    
    return signals;
  }
  
  /**
   * Get relevant entries for signal generation
   * - Last 48 hours
   * - Relevance >= 70
   * - Has tickers
   * - Grouped by ticker for context
   */
  private async getRelevantEntries() {
    const result = await pool.query(`
      SELECT 
        source_type,
        source_name,
        ai_summary,
        ai_relevance_score,
        ai_sentiment,
        ai_entities_tickers,
        ai_tags,
        event_date,
        raw_data
      FROM digest_entries
      WHERE event_date >= NOW() - INTERVAL '48 hours'
        AND ai_relevance_score >= 70
        AND ai_entities_tickers IS NOT NULL
        AND jsonb_array_length(ai_entities_tickers) > 0
      ORDER BY ai_relevance_score DESC
      LIMIT 50
    `);
    
    return result.rows;
  }
  
  /**
   * Generate AI trading signals using Claude
   */
  private async generateAISignals(entries: any[], limit: number): Promise<TradingSignal[]> {
    const prompt = this.buildSignalsPrompt(entries, limit);
    
    try {
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });
      
      const responseText = message.content[0].type === 'text' 
        ? message.content[0].text 
        : '';
      
      // Parse JSON response
      const parsed = JSON.parse(responseText);
      
      return parsed.signals || [];
      
    } catch (error) {
      console.error('AI signal generation failed:', error);
      
      // Fallback: Create basic signals from top entries
      return this.createFallbackSignals(entries, limit);
    }
  }
  
  /**
   * Build prompt for Claude to generate trading signals
   */
  private buildSignalsPrompt(entries: any[], limit: number): string {
    // Group entries by ticker
    const tickerGroups = new Map<string, any[]>();
    
    entries.forEach(entry => {
      if (entry.ai_entities_tickers) {
        entry.ai_entities_tickers.forEach((ticker: string) => {
          if (!tickerGroups.has(ticker)) {
            tickerGroups.set(ticker, []);
          }
          tickerGroups.get(ticker)!.push(entry);
        });
      }
    });
    
    // Build context for each ticker
    const tickerContext = Array.from(tickerGroups.entries())
      .map(([ticker, entries]) => {
        const summaries = entries.map(e => 
          `- ${e.ai_summary} (Relevance: ${e.ai_relevance_score}, Sentiment: ${e.ai_sentiment || 'neutral'})`
        ).join('\n');
        
        return `**${ticker}** (${entries.length} mentions):\n${summaries}`;
      })
      .slice(0, 20) // Top 20 tickers
      .join('\n\n');
    
    return `You are a professional trading analyst. Based on the following intelligence from the last 48 hours, generate ${limit} high-conviction trading signals.

**INTELLIGENCE DATA:**
${tickerContext}

**YOUR TASK:**
Analyze this data and create ${limit} actionable trading signals. For each signal:

1. **Identify the opportunity** - What's the specific trade setup?
2. **Determine action** - BUY, SELL, or WATCH
3. **Set price target** - Specific entry price (or null if market order)
4. **Calculate confidence** - 0-100 based on supporting evidence
5. **Estimate risk/reward** - Potential upside vs downside ratio
6. **Explain reasoning** - Why this opportunity exists NOW
7. **List catalysts** - What specific events/data support this
8. **Set timeframe** - "immediate" (today), "short-term" (1-5 days), "medium-term" (1-4 weeks)

**RULES:**
- Only recommend signals with 70+% confidence
- Prioritize tickers with multiple supporting entries
- Consider sentiment (bullish/bearish) and relevance scores
- Focus on actionable, specific opportunities
- Be contrarian when evidence is strong
- Avoid generic advice - be SPECIFIC (exact prices, timing, reasoning)

**EXAMPLE GOOD SIGNAL:**
{
  "ticker": "TSLA",
  "action": "BUY",
  "priceTarget": 405.00,
  "currentPrice": null,
  "confidence": 85,
  "riskReward": 3.2,
  "reasoning": "Multiple catalysts suggest upside: Q3 delivery beat expectations, analysts raising price targets, technical breakout above resistance",
  "catalysts": [
    "Q3 deliveries exceeded consensus by 8%",
    "5 analyst upgrades this week",
    "Technical: broke above 52-week resistance"
  ],
  "timeframe": "short-term",
  "supportingEntries": 3
}

**EXAMPLE BAD SIGNAL (DON'T DO THIS):**
{
  "ticker": "AAPL",
  "action": "WATCH",
  "reasoning": "Interesting company with potential",
  "confidence": 60
}
^ Too vague, no specific catalyst, low confidence

Respond ONLY with valid JSON in this exact format:
{
  "signals": [
    {
      "ticker": "string",
      "action": "BUY" | "SELL" | "WATCH",
      "priceTarget": number or null,
      "currentPrice": null,
      "confidence": number,
      "riskReward": number,
      "reasoning": "string",
      "catalysts": ["string"],
      "timeframe": "immediate" | "short-term" | "medium-term",
      "supportingEntries": number
    }
  ]
}

CRITICAL: Your entire response must be ONLY valid JSON, nothing else. No markdown, no explanations, just the JSON object.`;
  }
  
  /**
   * Create fallback signals if AI generation fails
   */
  private createFallbackSignals(entries: any[], limit: number): TradingSignal[] {
    // Group by ticker and take top ones
    const tickerCounts = new Map<string, any[]>();
    
    entries.forEach(entry => {
      if (entry.ai_entities_tickers) {
        entry.ai_entities_tickers.forEach((ticker: string) => {
          if (!tickerCounts.has(ticker)) {
            tickerCounts.set(ticker, []);
          }
          tickerCounts.get(ticker)!.push(entry);
        });
      }
    });
    
    // Convert to signals
    const signals: TradingSignal[] = [];
    
    Array.from(tickerCounts.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, limit)
      .forEach(([ticker, entries]) => {
        const avgRelevance = entries.reduce((sum, e) => sum + e.ai_relevance_score, 0) / entries.length;
        const bullishCount = entries.filter((e: any) => e.ai_sentiment === 'bullish').length;
        const bearishCount = entries.filter((e: any) => e.ai_sentiment === 'bearish').length;
        
        let action: 'BUY' | 'SELL' | 'WATCH' = 'WATCH';
        if (bullishCount > bearishCount && bullishCount >= 2) action = 'BUY';
        if (bearishCount > bullishCount && bearishCount >= 2) action = 'SELL';
        
        signals.push({
          ticker,
          action,
          priceTarget: null,
          currentPrice: null,
          confidence: Math.round(avgRelevance),
          riskReward: 2.0,
          reasoning: `${entries.length} intelligence entries detected. Sentiment: ${bullishCount} bullish, ${bearishCount} bearish.`,
          catalysts: entries.slice(0, 3).map((e: any) => e.ai_summary),
          timeframe: 'short-term',
          supportingEntries: entries.length
        });
      });
    
    return signals;
  }
}

export default new TradingOpportunitiesService();
