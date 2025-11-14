// backend/src/services/signalGeneratorServicePhase2.ts
// Phase 2: Enhanced with Executive Team Vetting

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
  executiveScore?: number;  // NEW
  executiveVetting?: any;   // NEW
}

class SignalGeneratorServicePhase2 {
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
      console.log(`  ✓ ${ticker}: $${price.toFixed(2)}`);
      return price;
      
    } catch (error) {
      console.error(`  Error fetching price for ${ticker}:`, error);
      return null;
    }
  }

  /**
   * Generate AI trading signals with executive vetting
   */
  async generateDailySignals(): Promise<Signal[]> {
    console.log('\n🤖 === GENERATING AI SIGNALS (PHASE 2: WITH EXECUTIVE VETTING) ===\n');
    
    try {
      // Step 0: Learn from past performance
      console.log('🧠 Step 0: Learning from past performance...');
      const performanceAnalysisService = (await import('./performanceAnalysisService.js')).default;
      const historicalInsights = await performanceAnalysisService.getInsightsForPrompt();
      console.log('✓ Loaded historical insights\n');

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

      // Step 2: Send to Claude for initial analysis
      console.log('🧠 Step 2: Getting initial recommendations from Claude...');
      const analysisPrompt = this.buildAnalysisPrompt(entries.rows, historicalInsights);
      
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

      // Step 3: Parse Claude's initial recommendations
      console.log('📋 Step 3: Parsing initial recommendations...');
      const initialSignals = this.parseClaudeResponse(responseText, entries.rows);
      console.log(`✓ Extracted ${initialSignals.length} initial signals\n`);

      // Step 3.5: VET EXECUTIVES (NEW - PHASE 2)
      console.log('👔 Step 3.5: Vetting executive teams (PHASE 2)...');
      const executiveVettingService = (await import('./executiveVettingService.js')).default;
      
      const vettedSignals: Signal[] = [];
      const rejectedSignals: string[] = [];
      
      for (const signal of initialSignals) {
        console.log(`\n  Vetting ${signal.ticker}...`);
        const vetting = await executiveVettingService.vetExecutives(signal.ticker);
        
        // Filter threshold: 60/100 (realistic for Phase 2)
        if (vetting.overallScore >= 60) {
          console.log(`  ✅ ${signal.ticker}: ${vetting.overallScore}/100 - APPROVED`);
          
          // Enhance reasoning with executive quality
          const enhancedReasoning = `${signal.reasoning} Executive Quality (${vetting.overallScore}/100): ${vetting.recommendation}`;
          
          vettedSignals.push({
            ...signal,
            reasoning: enhancedReasoning,
            executiveScore: vetting.overallScore,
            executiveVetting: vetting
          });
        } else {
          console.log(`  ❌ ${signal.ticker}: ${vetting.overallScore}/100 - REJECTED (management quality below 60)`);
          rejectedSignals.push(`${signal.ticker} (score: ${vetting.overallScore})`);
        }
        
        // Rate limiting
        await this.sleep(2000);
      }
      
      console.log(`\n✓ Executive vetting complete`);
      console.log(`  Approved: ${vettedSignals.length}`);
      console.log(`  Rejected: ${rejectedSignals.length}${rejectedSignals.length > 0 ? ` (${rejectedSignals.join(', ')})` : ''}\n`);

      // If we rejected too many, we might need more signals
      if (vettedSignals.length < 3) {
        console.log('⚠️ Warning: Less than 3 signals passed executive vetting');
      }

      // Step 4: Get REAL prices and calculate shares
      console.log('💰 Step 4: Fetching REAL market prices...');
      const signalsWithPrices: Signal[] = [];
      
      for (const signal of vettedSignals) {
        const realPrice = await this.getRealStockPrice(signal.ticker);
        
        if (realPrice) {
          const shares = 100 / realPrice;
          signalsWithPrices.push({
            ...signal,
            entryPrice: realPrice,
            shares: parseFloat(shares.toFixed(4))
          });
        } else {
          console.log(`  ⚠️ Skipping ${signal.ticker} - no price available`);
        }
        
        await this.sleep(12000); // Alpha Vantage rate limit
      }

      console.log(`\n✅ Generated ${signalsWithPrices.length} signals with executive vetting + REAL prices\n`);
      
      // Step 5: Save to tip tracker
      console.log('💾 Step 5: Saving to AI Tip Tracker...');
      for (const signal of signalsWithPrices) {
        await this.saveToTipTracker(signal, entries.rows);
      }
      
      console.log('✅ All signals saved!\n');
      return signalsWithPrices;
      
    } catch (error) {
      console.error('Signal generation failed:', error);
      throw error;
    }
  }

  /**
   * Build analysis prompt with historical insights
   */
  private buildAnalysisPrompt(entries: any[], historicalInsights: string): string {
    const entriesText = entries.map(e => 
      `[${e.source_type}] ${e.ai_summary} | Tickers: ${(e.tickers || []).join(', ')} | Sentiment: ${e.ai_sentiment} | Score: ${e.ai_relevance_score}`
    ).join('\n');

    return `You are a professional stock analyst analyzing market intelligence data to identify the 5 BEST trading opportunities for the next 1-7 days.

${historicalInsights}

MARKET INTELLIGENCE DATA (Last 7 Days):
${entriesText}

TASK: Identify the top 5 trading opportunities with the HIGHEST conviction based on:
1. The market intelligence data above
2. The historical performance patterns (what worked, what failed)
3. Your understanding of what makes winning opportunities

CRITICAL REQUIREMENTS:
- ONLY recommend opportunities that match our winning patterns
- AVOID patterns that historically failed (especially Healthcare has 83% win rate - prioritize it!)
- Aim for 70%+ win rate by being highly selective
- Focus on high-probability setups similar to past winners (AAPL, PLTR, JBHT)
- Consider sector performance from historical data

NOTE: These signals will undergo executive team vetting next. Companies with poor management will be filtered out.

For each opportunity, provide:
1. Ticker symbol (e.g., AAPL, NVDA)
2. Company name
3. Action: BUY, SELL, or WATCH
4. Confidence: 0-100 (only recommend if >75, aim for 80+)
5. Reasoning: 2-3 sentences explaining WHY this is an opportunity NOW and HOW it matches our winning patterns
6. Catalysts: 2-4 specific upcoming events or factors
7. Predicted gain %: Your estimate for next 7 days
8. Risk factors: 2-3 key risks
9. Time horizon: "1-3 days", "3-7 days", or "1-2 weeks"

Focus on:
- Strong directional conviction (clear BUY or SELL thesis)
- Timely catalysts happening soon
- Clear risk/reward setup
- Patterns that match our historical winners (especially Healthcare 83% win rate)
- Avoiding patterns that match our historical losers
- Large cap companies with institutional support (better management)

Respond ONLY with valid JSON in this exact format:
{
  "signals": [
    {
      "ticker": "AAPL",
      "companyName": "Apple Inc.",
      "action": "BUY",
      "confidence": 85,
      "reasoning": "Strong iPhone demand in China plus new AI features announcement creates bullish setup. Matches our winning pattern of tech leaders with upcoming catalysts.",
      "catalysts": ["Earnings in 2 days", "New product launch", "Analyst upgrades"],
      "predictedGainPct": 5.2,
      "riskFactors": ["Market volatility", "Supply chain concerns"],
      "timeHorizon": "3-7 days"
    }
  ]
}

IMPORTANT: 
- Return EXACTLY 5 signals (no more, no less)
- Only include tickers you have HIGH conviction on (confidence >75)
- Be specific about catalysts with actual dates/events when possible
- Base predictions on intelligence data AND historical performance patterns
- Reference why this matches winning patterns in the reasoning`;
  }

  /**
   * Parse Claude's response into signals
   */
  private parseClaudeResponse(responseText: string, entries: any[]): Signal[] {
    try {
      const cleanedText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleanedText);
      
      if (!parsed.signals || !Array.isArray(parsed.signals)) {
        console.error('Invalid response format');
        return [];
      }

      const entryIds = entries.map(e => e.id);
      
      return parsed.signals.map((s: any) => ({
        ticker: s.ticker,
        companyName: s.companyName,
        action: s.action,
        confidence: s.confidence,
        reasoning: s.reasoning,
        catalysts: s.catalysts || [],
        predictedGainPct: s.predictedGainPct,
        entryPrice: 0,
        shares: 0,
        riskFactors: s.riskFactors || [],
        timeHorizon: s.timeHorizon,
        digestEntryIds: entryIds
      }));
      
    } catch (error) {
      console.error('Failed to parse Claude response:', error);
      return [];
    }
  }

  /**
   * Save signal to ai_tip_tracker
   */
  private async saveToTipTracker(signal: Signal, entries: any[]): Promise<void> {
    try {
      const mockInvestment = 100.00;
      
      await pool.query(`
        INSERT INTO ai_tip_tracker (
          ticker,
          company_name,
          recommendation_type,
          entry_price,
          entry_date,
          mock_investment,
          shares,
          ai_reasoning,
          ai_confidence,
          predicted_gain_pct,
          status,
          source_digest_ids,
          ai_catalysts,
          ai_risk_factors,
          time_horizon,
          executive_score,
          created_by
        ) VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      `, [
        signal.ticker,
        signal.companyName,
        signal.action,
        signal.entryPrice.toFixed(2),
        mockInvestment.toFixed(2),
        signal.shares.toFixed(4),
        signal.reasoning,
        signal.confidence,
        signal.predictedGainPct.toFixed(2),
        'OPEN',
        signal.digestEntryIds,
        JSON.stringify(signal.catalysts),
        JSON.stringify(signal.riskFactors),
        signal.timeHorizon,
        signal.executiveScore || null,
        'AI_SYSTEM'
      ]);
      
      console.log(`  ✓ Saved ${signal.ticker} (Executive: ${signal.executiveScore}/100)`);
      
    } catch (error: any) {
      console.error(`Failed to save ${signal.ticker}:`, error.message);
    }
  }

  /**
   * Get latest signals
   */
  async getLatestSignals(limit: number = 10): Promise<any[]> {
    const result = await pool.query(`
      SELECT * FROM ai_tip_tracker
      ORDER BY entry_date DESC
      LIMIT $1
    `, [limit]);
    
    return result.rows;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default new SignalGeneratorServicePhase2();
