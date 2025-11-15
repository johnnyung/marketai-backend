// backend/src/services/signalGeneratorServicePhase3.ts
// Phase 3: Enhanced with Comprehensive 8-Dimension Business Analysis

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
  analysisScore?: number;
  analysis?: any;
}

class SignalGeneratorServicePhase3 {
  /**
   * Get REAL current stock price from Alpha Vantage
   */
  private async getRealStockPrice(ticker: string): Promise<number | null> {
    try {
      const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${ALPHA_VANTAGE_API_KEY}`;
      const response = await axios.get(url);
      
      const quote = response.data['Global Quote'];
      if (!quote || !quote['05. price']) {
        console.log(`  ⚠️ No price data for ${ticker}`);
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
   * Generate AI trading signals with comprehensive business analysis
   */
  async generateDailySignals(): Promise<Signal[]> {
    console.log('\n🤖 === GENERATING AI SIGNALS (PHASE 3: COMPREHENSIVE ANALYSIS) ===\n');
    
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

      // Step 3.5: COMPREHENSIVE BUSINESS ANALYSIS (NEW - PHASE 3)
      console.log('🔍 Step 3.5: Comprehensive 8-dimension analysis (PHASE 3)...');
      const comprehensiveAnalysis = (await import('./comprehensiveBusinessAnalysis.js')).default;
      
      const analyzedSignals: Signal[] = [];
      const rejectedSignals: string[] = [];
      
      for (const signal of initialSignals) {
        console.log(`\n  Analyzing ${signal.ticker}...`);
        
        try {
          const analysis = await comprehensiveAnalysis.analyzeCompany(signal.ticker, historicalInsights);
          
          // Filter threshold: 65/100 (quality companies)
          if (analysis.overallScore >= 65) {
            console.log(`  ✅ ${signal.ticker}: ${analysis.overallScore}/100 - APPROVED`);
            console.log(`     Business Quality: ${analysis.businessQuality.score}/${analysis.businessQuality.maxScore}`);
            console.log(`     ${analysis.recommendation}`);
            
            // Enhance reasoning with comprehensive analysis
            const enhancedReasoning = `${signal.reasoning}\n\nCOMPREHENSIVE ANALYSIS (${analysis.overallScore}/100): ${analysis.investmentThesis} ${analysis.comparison}`;
            
            analyzedSignals.push({
              ...signal,
              reasoning: enhancedReasoning,
              analysisScore: analysis.overallScore,
              analysis: analysis
            });
          } else {
            console.log(`  ❌ ${signal.ticker}: ${analysis.overallScore}/100 - REJECTED (quality score below 65)`);
            console.log(`     Concerns: ${analysis.concerns.slice(0, 2).join(', ')}`);
            rejectedSignals.push(`${signal.ticker} (score: ${analysis.overallScore})`);
          }
        } catch (error) {
          console.log(`  ⚠️ ${signal.ticker}: Analysis failed, including with caution`);
          // Include signal even if analysis fails (don't lose good opportunities due to API issues)
          analyzedSignals.push({
            ...signal,
            analysisScore: 70 // Neutral score for failed analysis
          });
        }
        
        // Rate limiting
        await this.sleep(3000);
      }
      
      console.log(`\n✓ Comprehensive analysis complete`);
      console.log(`  Approved: ${analyzedSignals.length}`);
      console.log(`  Rejected: ${rejectedSignals.length}${rejectedSignals.length > 0 ? ` (${rejectedSignals.join(', ')})` : ''}\n`);

      // If we rejected too many, we might need more signals
      if (analyzedSignals.length < 3) {
        console.log('⚠️ Warning: Less than 3 signals passed comprehensive analysis');
      }

      // Step 4: Get REAL prices and calculate shares
      console.log('💰 Step 4: Fetching REAL market prices...');
      const signalsWithPrices: Signal[] = [];
      
      for (const signal of analyzedSignals) {
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

      console.log(`\n✅ Generated ${signalsWithPrices.length} signals with comprehensive analysis + REAL prices\n`);
      
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
- PRIORITIZE Healthcare sector (83% historical win rate!)
- Focus on high-quality businesses (will be comprehensively analyzed next)
- Aim for 70%+ win rate by being highly selective
- Focus on high-probability setups similar to past winners (AAPL, PLTR, JBHT)

NOTE: These signals will undergo comprehensive 8-dimension business analysis including:
- Executive quality, business moat, financial strength, industry position
- Growth potential, valuation, catalysts, and risks
- Companies with weak fundamentals will be filtered out

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
- Quality businesses with competitive advantages

Respond ONLY with valid JSON in this exact format:
{
  "signals": [
    {
      "ticker": "AAPL",
      "companyName": "Apple Inc.",
      "action": "BUY",
      "confidence": 85,
      "reasoning": "Strong iPhone demand in China plus new AI features announcement creates bullish setup. Matches our winning pattern of tech leaders with upcoming catalysts and strong moats.",
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
- Reference why this matches winning patterns in the reasoning
- Focus on QUALITY businesses that will pass comprehensive analysis`;
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
          analysis_score,
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
        signal.analysisScore || null,
        'AI_SYSTEM_PHASE3'
      ]);
      
      console.log(`  ✓ Saved ${signal.ticker} (Analysis: ${signal.analysisScore}/100)`);
      
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

export default new SignalGeneratorServicePhase3();
