// backend/src/services/signalGeneratorService.ts
// Generates 5 AI trading signals from digest entries with REAL prices

import Anthropic from '@anthropic-ai/sdk';
import { Pool } from 'pg';
import axios from 'axios';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

interface Signal {
  ticker: string;
  companyName: string;
  action: 'BUY' | 'SELL' | 'WATCH';
  confidence: number;
  reasoning: string;
  catalysts: string[];
  predictedGainPct: number;
  entryPrice: number;
  shares: number;
  riskFactors: string[];
  timeHorizon: string;
  digestEntryIds: number[];
}

class SignalGeneratorService {
  /**
   * Get REAL current stock price from Alpha Vantage
   */
  private async getRealStockPrice(ticker: string): Promise<number | null> {
    try {
      const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${ALPHA_VANTAGE_API_KEY}`;
      const response = await axios.get(url);
      
      const quote = response.data['Global Quote'];
      if (!quote || !quote['05. price']) {
        console.log(`⚠️ No price data for ${ticker}`);
        return null;
      }
      
      const price = parseFloat(quote['05. price']);
      console.log(`✓ ${ticker}: $${price.toFixed(2)}`);
      return price;
      
    } catch (error) {
      console.error(`Error fetching price for ${ticker}:`, error);
      return null;
    }
  }

  /**
   * Generate 5 AI trading signals from digest entries
   */
  async generateDailySignals(): Promise<Signal[]> {
    console.log('\n🤖 === GENERATING DAILY AI SIGNALS ===\n');
    
    try {
      // Step 1: Fetch recent high-relevance digest entries
      console.log('📊 Step 1: Fetching high-quality digest entries...');
      const entries = await pool.query(`
        SELECT 
          id,
          source_type,
          source_name,
          ai_summary,
          ai_relevance_score,
          ai_sentiment,
          tickers,
          event_date
        FROM digest_entries
        WHERE 
          ai_relevance_score >= 70
          AND event_date > NOW() - INTERVAL '7 days'
          AND expires_at > NOW()
        ORDER BY ai_relevance_score DESC, event_date DESC
        LIMIT 50
      `);
      
      console.log(`✓ Found ${entries.rows.length} high-relevance entries\n`);
      
      if (entries.rows.length === 0) {
        console.log('⚠️ No high-quality entries found');
        return [];
      }

      // Step 2: Send to Claude for analysis
      console.log('🧠 Step 2: Analyzing with Claude AI...');
      const analysisPrompt = this.buildAnalysisPrompt(entries.rows);
      
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: analysisPrompt
        }]
      });

      const responseText = message.content[0].type === 'text' 
        ? message.content[0].text 
        : '';
      
      console.log('✓ Claude analysis complete\n');

      // Step 3: Parse Claude's response
      console.log('📋 Step 3: Parsing recommendations...');
      const signals = this.parseClaudeResponse(responseText, entries.rows);
      console.log(`✓ Extracted ${signals.length} signals\n`);

      // Step 4: Get REAL prices and calculate shares
      console.log('💰 Step 4: Fetching REAL market prices...');
      const signalsWithPrices: Signal[] = [];
      
      for (const signal of signals) {
        const realPrice = await this.getRealStockPrice(signal.ticker);
        
        if (realPrice) {
          const shares = 100 / realPrice; // $100 investment / real price
          signalsWithPrices.push({
            ...signal,
            entryPrice: realPrice,
            shares: parseFloat(shares.toFixed(4))
          });
        } else {
          console.log(`⚠️ Skipping ${signal.ticker} - no price available`);
        }
        
        // Rate limiting - Alpha Vantage allows 5 calls/minute
        await this.sleep(12000);
      }

      console.log(`\n✅ Generated ${signalsWithPrices.length} signals with REAL prices\n`);
      
      // Step 5: Save to tip tracker
      console.log('💾 Step 5: Saving to AI Tip Tracker...');
      for (const signal of signalsWithPrices) {
        await this.saveToTipTracker(signal);
      }
      console.log('✓ All signals saved\n');

      return signalsWithPrices;
      
    } catch (error) {
      console.error('❌ Signal generation failed:', error);
      throw error;
    }
  }

  /**
   * Build analysis prompt for Claude
   */
  private buildAnalysisPrompt(entries: any[]): string {
    const entriesText = entries.map(e => 
      `[${e.source_type}] ${e.ai_summary} | Tickers: ${(e.tickers || []).join(', ')} | Sentiment: ${e.ai_sentiment} | Score: ${e.ai_relevance_score}`
    ).join('\n');

    return `You are a professional stock analyst analyzing market intelligence data to identify the 5 BEST trading opportunities for the next 1-7 days.

MARKET INTELLIGENCE DATA (Last 7 Days):
${entriesText}

TASK: Identify the top 5 trading opportunities with the HIGHEST conviction based on this intelligence.

For each opportunity, provide:
1. Ticker symbol (e.g., AAPL, NVDA)
2. Company name
3. Action: BUY, SELL, or WATCH
4. Confidence: 0-100 (only recommend if >70)
5. Reasoning: 2-3 sentences explaining WHY this is an opportunity NOW
6. Catalysts: 2-4 specific upcoming events or factors
7. Predicted gain %: Your estimate for next 7 days
8. Risk factors: 2-3 key risks
9. Time horizon: "1-3 days", "3-7 days", or "1-2 weeks"

Focus on:
- Strong directional conviction (clear BUY or SELL thesis)
- Timely catalysts happening soon
- Clear risk/reward setup
- Actionable opportunities backed by the intelligence data

Respond ONLY with valid JSON in this exact format:
{
  "signals": [
    {
      "ticker": "AAPL",
      "companyName": "Apple Inc.",
      "action": "BUY",
      "confidence": 85,
      "reasoning": "Strong iPhone demand in China plus new AI features announcement creates bullish setup.",
      "catalysts": ["Earnings in 2 days", "New product launch", "Analyst upgrades"],
      "predictedGainPct": 5.2,
      "riskFactors": ["Market volatility", "Supply chain concerns"],
      "timeHorizon": "3-7 days"
    }
  ]
}

IMPORTANT: 
- Return EXACTLY 5 signals (no more, no less)
- Only include tickers you have HIGH conviction on (confidence >70)
- Be specific about catalysts with actual dates/events when possible
- Base predictions on the intelligence data provided`;
  }

  /**
   * Parse Claude's JSON response
   */
  private parseClaudeResponse(responseText: string, entries: any[]): Omit<Signal, 'entryPrice' | 'shares'>[] {
    try {
      // Remove markdown code blocks if present
      let cleanJson = responseText.trim();
      cleanJson = cleanJson.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      const parsed = JSON.parse(cleanJson);
      
      if (!parsed.signals || !Array.isArray(parsed.signals)) {
        throw new Error('Invalid response format');
      }

      return parsed.signals.map((s: any) => ({
        ticker: s.ticker,
        companyName: s.companyName || s.ticker,
        action: s.action,
        confidence: s.confidence,
        reasoning: s.reasoning,
        catalysts: s.catalysts || [],
        predictedGainPct: s.predictedGainPct || 0,
        riskFactors: s.riskFactors || [],
        timeHorizon: s.timeHorizon || '3-7 days',
        digestEntryIds: entries.slice(0, 10).map(e => e.id) // Link to top entries
      }));
      
    } catch (error) {
      console.error('Failed to parse Claude response:', error);
      return [];
    }
  }

  /**
   * Save signal to ai_tip_tracker with REAL prices
   */
  private async saveToTipTracker(signal: Signal): Promise<void> {
    try {
      await pool.query(`
        INSERT INTO ai_tip_tracker (
          ticker,
          company_name,
          recommendation_type,
          source,
          entry_price,
          entry_date,
          shares,
          mock_investment,
          status,
          ai_confidence,
          ai_prediction_pct,
          ai_reasoning,
          ai_catalysts,
          digest_entry_ids,
          signal_data
        ) VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, $8, $9, $10, $11, $12, $13, $14)
      `, [
        signal.ticker,
        signal.companyName,
        signal.action,
        'daily_intelligence',
        signal.entryPrice,          // REAL market price
        signal.shares,              // Calculated from $100 / real price
        100.00,                     // Fixed $100 tracking amount
        'OPEN',
        signal.confidence,
        signal.predictedGainPct,
        signal.reasoning,
        JSON.stringify(signal.catalysts),
        JSON.stringify(signal.digestEntryIds),
        JSON.stringify(signal)
      ]);
      
      console.log(`  ✓ Saved ${signal.ticker} @ $${signal.entryPrice} (${signal.shares} shares)`);
      
    } catch (error) {
      console.error(`Failed to save ${signal.ticker}:`, error);
    }
  }

  /**
   * Get latest signals (for API endpoint)
   */
  async getLatestSignals(limit: number = 5): Promise<any[]> {
    const result = await pool.query(`
      SELECT 
        id,
        ticker,
        company_name,
        recommendation_type,
        entry_date,
        entry_price,
        shares,
        current_price,
        current_pnl,
        current_pnl_pct,
        status,
        ai_confidence,
        ai_prediction_pct,
        ai_reasoning,
        ai_catalysts,
        days_held,
        created_at
      FROM ai_tip_tracker
      ORDER BY entry_date DESC
      LIMIT $1
    `, [limit]);
    
    return result.rows;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default new SignalGeneratorService();
