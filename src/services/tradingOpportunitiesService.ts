// backend/src/services/tradingOpportunitiesService.ts
// AI-Generated Trading Signals - WITH CACHING & AI TIP TRACKER INTEGRATION

import Anthropic from '@anthropic-ai/sdk';
import { Pool } from 'pg';
import aiTipTrackerService from './aiTipTrackerService.js';
import priceService from './priceService.js';

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
  
  async generateTradingSignals(limit: number = 5, autoTrack: boolean = false): Promise<TradingSignal[]> {
    console.log('🎯 Generating trading signals...');
    
    // Check cache first (today only)
    const cached = await this.getCachedSignals();
    if (cached && cached.length > 0) {
      console.log(`  ✓ Using cached signals (${cached.length} signals)`);
      return cached;
    }
    
    console.log('  ✓ No cache found, generating new signals...');
    
    const entries = await this.getRecentEntries();
    console.log(`  ✓ Found ${entries.length} recent high-priority entries`);
    
    if (entries.length === 0) {
      return [];
    }
    
    try {
      const signals = await this.generateAISignals(entries, limit);
      console.log(`  ✓ Generated ${signals.length} signals`);
      
      // Cache the signals
      await this.cacheSignals(signals);
      console.log('  ✓ Cached signals for today');
      
      // Auto-track if requested (keeping existing functionality)
      if (autoTrack) {
        await this.autoTrackSignals(signals);
      }
      
      return signals;
    } catch (error) {
      console.error('AI generation failed, using fallback');
      return this.createFallbackSignals(entries, limit);
    }
  }
  
  /**
   * Get cached trading signals (today only)
   */
  private async getCachedSignals(): Promise<TradingSignal[] | null> {
    try {
      const result = await pool.query(`
        SELECT signals FROM trading_signals_cache
        WHERE created_date = CURRENT_DATE
        LIMIT 1
      `);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0].signals;
    } catch (error) {
      console.error('Error fetching cached signals:', error);
      return null;
    }
  }
  
  /**
   * Cache trading signals in database
   */
  private async cacheSignals(signals: TradingSignal[]): Promise<void> {
    try {
      await pool.query(`
        INSERT INTO trading_signals_cache (signals)
        VALUES ($1)
        ON CONFLICT (created_date) DO UPDATE
        SET signals = EXCLUDED.signals, generated_at = NOW()
      `, [JSON.stringify(signals)]);
    } catch (error) {
      console.error('Error caching signals:', error);
      // Don't fail if caching fails
    }
  }
  
  /**
   * Auto-track signals in AI Tip Tracker
   */
  private async autoTrackSignals(signals: TradingSignal[]): Promise<void> {
    console.log('💰 Auto-tracking signals in AI Tip Tracker...');
    
    for (const signal of signals) {
      // Only track BUY and SELL signals, not WATCH
      if (signal.action === 'WATCH') {
        console.log(`  ⏭️ Skipping ${signal.ticker} (action: WATCH)`);
        continue;
      }
      
      try {
        // Get current price
        const currentPrice = signal.currentPrice || await this.getCurrentPrice(signal.ticker);
        
        if (!currentPrice) {
          console.log(`  ⚠️ Could not get price for ${signal.ticker}, skipping auto-track`);
          continue;
        }
        
        // Use AI Tip Tracker service to create position
        await aiTipTrackerService.createPosition({
          ticker: signal.ticker,
          companyName: this.getCompanyName(signal.ticker)[0],
          recommendationType: signal.action,
          entryPrice: currentPrice,
          aiReasoning: signal.reasoning,
          aiConfidence: signal.confidence,
          aiPredictionPct: undefined, // Changed from null to undefined
          aiPredictionTarget: signal.priceTarget || undefined,
          aiPredictionTimeframe: signal.timeframe
        });
        
        console.log(`  ✅ Auto-tracked ${signal.ticker} (Price: $${currentPrice})`);
        
      } catch (error: any) {
        console.error(`Error auto-tracking ${signal.ticker}:`, error.message);
      }
    }
  }
  
  /**
   * Generate trading signal for a specific ticker
   */
  async generateTickerSignal(ticker: string): Promise<TradingSignal | null> {
    console.log(`🎯 Generating signal for ${ticker}...`);
    
    ticker = ticker.toUpperCase();
    
    // Get entries mentioning this ticker
    const entries = await this.getTickerEntries(ticker);
    console.log(`  ✓ Found ${entries.length} entries mentioning ${ticker}`);
    
    if (entries.length === 0) {
      console.log(`  ⚠️ No recent intelligence found for ${ticker}`);
      return null;
    }
    
    try {
      const signal = await this.generateAITickerSignal(ticker, entries);
      console.log(`  ✓ Generated signal for ${ticker}: ${signal.action}`);
      return signal;
    } catch (error) {
      console.error(`Failed to generate signal for ${ticker}:`, error);
      return null;
    }
  }
  
  /**
   * Map ticker to company name for better searching
   */
  private getCompanyName(ticker: string): string[] {
    const tickerMap: Record<string, string[]> = {
      'ACHR': ['Archer Aviation', 'Archer'],
      'JOBY': ['Joby Aviation', 'Joby'],
      'LILM': ['Lilium'],
      'PLTR': ['Palantir'],
      'TSLA': ['Tesla'],
      'NVDA': ['NVIDIA', 'Nvidia'],
      'RIVN': ['Rivian'],
      'LCID': ['Lucid Motors', 'Lucid'],
      'AAPL': ['Apple'],
      'MSFT': ['Microsoft'],
      'GOOGL': ['Google', 'Alphabet'],
      'AMZN': ['Amazon'],
      'META': ['Meta', 'Facebook']
    };
    
    return tickerMap[ticker] || [ticker];
  }
  
  /**
   * Get entries mentioning a specific ticker
   */
  private async getTickerEntries(ticker: string) {
    const companyNames = this.getCompanyName(ticker);
    
    // Build OR conditions for all company name variations
    const nameConditions = companyNames.map((_, i) => 
      `ai_summary ILIKE '%' || $${i + 2} || '%'`
    ).join(' OR ');
    
    const query = `
      SELECT 
        source_type,
        source_name,
        ai_summary,
        ai_relevance_score,
        ai_sentiment,
        event_date
      FROM digest_entries
      WHERE event_date >= NOW() - INTERVAL '7 days'
        AND (
          ai_entities_tickers @> to_jsonb(ARRAY[$1]::text[])
          OR ${nameConditions}
        )
      ORDER BY ai_relevance_score DESC, event_date DESC
      LIMIT 30
    `;
    
    const result = await pool.query(query, [ticker, ...companyNames]);
    
    return result.rows;
  }
  
  /**
   * Generate AI signal for specific ticker
   */
  private async generateAITickerSignal(ticker: string, entries: any[]): Promise<TradingSignal> {
    const entriesSummary = entries.map(e => 
      `- ${e.ai_summary} (Score: ${e.ai_relevance_score}, Sentiment: ${e.ai_sentiment || 'neutral'}, Date: ${e.event_date})`
    ).join('\n');
    
    const prompt = `You are a trading analyst. Based on recent intelligence about ${ticker}, generate a trading signal.

RECENT INTELLIGENCE ABOUT ${ticker}:
${entriesSummary}

Analyze this ticker specifically and provide a trading recommendation.

Respond with ONLY valid JSON (no markdown):
{
  "ticker": "${ticker}",
  "action": "BUY" or "SELL" or "WATCH",
  "priceTarget": number or null,
  "currentPrice": null,
  "confidence": 70-100,
  "riskReward": number,
  "reasoning": "specific detailed reason based on the intelligence",
  "catalysts": ["specific catalyst 1", "catalyst 2"],
  "timeframe": "immediate" or "short-term" or "medium-term",
  "supportingEntries": ${entries.length}
}`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    });
    
    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    
    return parsed;
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
  
  /**
   * Get current price for ticker using real price service
   */
  private async getCurrentPrice(ticker: string): Promise<number | null> {
      const priceData = await priceService.getCurrentPrice(ticker);
      return priceData?.price || null;
  }
}

export default new TradingOpportunitiesService();
