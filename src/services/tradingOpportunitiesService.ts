// backend/src/services/tradingOpportunitiesService.ts
// AI-Generated Trading Signals - SIMPLIFIED VERSION

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
  confidence: number;
  riskReward: number;
  reasoning: string;
  catalysts: string[];
  timeframe: string;
  supportingEntries: number;
}

class TradingOpportunitiesService {
  
  async generateTradingSignals(limit: number = 5): Promise<TradingSignal[]> {
    console.log('🎯 Generating trading signals...');
    
    const entries = await this.getRecentEntries();
    console.log(`  ✓ Found ${entries.length} recent high-priority entries`);
    
    if (entries.length === 0) {
      return [];
    }
    
    try {
      const signals = await this.generateAISignals(entries, limit);
      console.log(`  ✓ Generated ${signals.length} signals`);
      return signals;
    } catch (error) {
      console.error('AI generation failed, using fallback');
      return this.createFallbackSignals(entries, limit);
    }
  }
  
  private async getRecentEntries() {
    const result = await pool.query(`
      SELECT 
        source_type,
        source_name,
        ai_summary,
        ai_relevance_score,
        ai_sentiment,
        event_date
      FROM digest_entries
      WHERE event_date >= NOW() - INTERVAL '48 hours'
        AND ai_relevance_score >= 70
      ORDER BY ai_relevance_score DESC
      LIMIT 50
    `);
    
    return result.rows;
  }
  
  private async generateAISignals(entries: any[], limit: number): Promise<TradingSignal[]> {
    const entriesSummary = entries.slice(0, 20).map(e => 
      `- ${e.ai_summary} (Score: ${e.ai_relevance_score}, Sentiment: ${e.ai_sentiment || 'neutral'})`
    ).join('\n');
    
    const prompt = `You are a trading analyst. Based on this intelligence from the last 48 hours, generate ${limit} trading signals.

INTELLIGENCE:
${entriesSummary}

Extract tickers from company names (e.g., "Merck" -> "MRK", "Tesla" -> "TSLA").

Respond with ONLY valid JSON (no markdown):
{
  "signals": [
    {
      "ticker": "string",
      "action": "BUY" or "SELL" or "WATCH",
      "priceTarget": number or null,
      "currentPrice": null,
      "confidence": 70-100,
      "riskReward": number,
      "reasoning": "specific reason why",
      "catalysts": ["specific catalyst 1", "catalyst 2"],
      "timeframe": "immediate" or "short-term" or "medium-term",
      "supportingEntries": number
    }
  ]
}`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }]
    });
    
    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    
    return parsed.signals || [];
  }
  
  private createFallbackSignals(entries: any[], limit: number): TradingSignal[] {
    const signals: TradingSignal[] = [];
    
    // Group by sentiment
    const bullish = entries.filter(e => e.ai_sentiment === 'bullish');
    const bearish = entries.filter(e => e.ai_sentiment === 'bearish');
    
    // Create signals from top entries
    const topEntries = entries.slice(0, limit);
    
    topEntries.forEach(entry => {
      // Try to extract ticker from summary
      const tickerMatch = entry.ai_summary.match(/\b[A-Z]{2,5}\b/);
      const ticker = tickerMatch ? tickerMatch[0] : 'SPY';
      
      const isBullish = entry.ai_sentiment === 'bullish';
      
      signals.push({
        ticker,
        action: isBullish ? 'BUY' : (entry.ai_sentiment === 'bearish' ? 'SELL' : 'WATCH'),
        priceTarget: null,
        currentPrice: null,
        confidence: entry.ai_relevance_score,
        riskReward: 2.0,
        reasoning: entry.ai_summary,
        catalysts: [entry.ai_summary],
        timeframe: 'short-term',
        supportingEntries: 1
      });
    });
    
    return signals;
  }
}

export default new TradingOpportunitiesService();
