// backend/src/services/signalGeneratorServicePhase4.ts
// Phase 4: Pattern Recognition + Adaptive Learning

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
  successProbability?: number; // NEW - Phase 4
}

class SignalGeneratorServicePhase4 {
  /**
   * Get REAL current stock price
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
   * Generate AI trading signals with pattern recognition
   */
  async generateDailySignals(): Promise<Signal[]> {
    console.log('\n🤖 === GENERATING AI SIGNALS (PHASE 4: PATTERN RECOGNITION) ===\n');
    
    try {
      // Step 0: Learn from past performance + patterns
      console.log('🧠 Step 0: Learning from performance + patterns...');
      const performanceAnalysisService = (await import('./performanceAnalysisService.js')).default;
      const patternRecognitionService = (await import('./patternRecognitionService.js')).default;
      
      const historicalInsights = await performanceAnalysisService.getInsightsForPrompt();
      const patternInsights = await patternRecognitionService.getLatestInsights();
      
      console.log('✓ Loaded historical insights');
      console.log('✓ Loaded pattern insights');
      
      // Build enhanced context with pattern learning
      let patternContext = '';
      if (patternInsights) {
        patternContext = this.buildPatternContext(patternInsights);
        console.log('✓ Pattern learning integrated\n');
      } else {
        console.log('⚠️ No pattern data yet (need 10+ closed trades)\n');
      }

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
      const analysisPrompt = this.buildAnalysisPrompt(
        entries.rows, 
        historicalInsights,
        patternContext,
        patternInsights
      );
      
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

      // Step 3.5: COMPREHENSIVE BUSINESS ANALYSIS
      console.log('🔍 Step 3.5: Comprehensive 8-dimension analysis...');
      const comprehensiveAnalysis = (await import('./comprehensiveBusinessAnalysis.js')).default;
      
      const analyzedSignals: Signal[] = [];
      const rejectedSignals: string[] = [];
      
      // Use adaptive threshold from pattern learning
      const minScore = patternInsights?.optimalThresholds?.minOverallScore || 65;
      console.log(`  Using adaptive threshold: ${minScore}/100 (from pattern learning)\n`);
      
      for (const signal of initialSignals) {
        console.log(`\n  Analyzing ${signal.ticker}...`);
        
        try {
          const analysis = await comprehensiveAnalysis.analyzeCompany(signal.ticker, historicalInsights);
          
          // Calculate success probability (Phase 4)
          const successProbability = await patternRecognitionService.calculateSuccessProbability({
            analysisScore: analysis.overallScore,
            analysis: analysis
          });
          
          // Use adaptive threshold
          if (analysis.overallScore >= minScore) {
            console.log(`  ✅ ${signal.ticker}: ${analysis.overallScore}/100 - APPROVED`);
            console.log(`     Business Quality: ${analysis.businessQuality.score}/${analysis.businessQuality.maxScore}`);
            console.log(`     Success Probability: ${(successProbability * 100).toFixed(1)}%`);
            console.log(`     ${analysis.recommendation}`);
            
            // Enhance reasoning with comprehensive analysis + probability
            const enhancedReasoning = `${signal.reasoning}\n\nCOMPREHENSIVE ANALYSIS (${analysis.overallScore}/100): ${analysis.investmentThesis} ${analysis.comparison}\n\nSUCCESS PROBABILITY: ${(successProbability * 100).toFixed(1)}% based on historical pattern matching.`;
            
            analyzedSignals.push({
              ...signal,
              reasoning: enhancedReasoning,
              analysisScore: analysis.overallScore,
              analysis: analysis,
              successProbability: successProbability
            });
          } else {
            console.log(`  ❌ ${signal.ticker}: ${analysis.overallScore}/100 - REJECTED (below threshold ${minScore})`);
            console.log(`     Concerns: ${analysis.concerns.slice(0, 2).join(', ')}`);
            rejectedSignals.push(`${signal.ticker} (score: ${analysis.overallScore})`);
          }
        } catch (error) {
          console.log(`  ⚠️ ${signal.ticker}: Analysis failed, skipping`);
        }
        
        // Rate limiting
        await this.sleep(3000);
      }
      
      console.log(`\n✓ Comprehensive analysis complete`);
      console.log(`  Approved: ${analyzedSignals.length}`);
      console.log(`  Rejected: ${rejectedSignals.length}${rejectedSignals.length > 0 ? ` (${rejectedSignals.join(', ')})` : ''}\n`);

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

      console.log(`\n✅ Generated ${signalsWithPrices.length} signals with pattern learning + REAL prices\n`);
      
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
   * Build pattern context for Claude prompt
   */
  private buildPatternContext(insights: any): string {
    let context = '\nPATTERN LEARNING INSIGHTS:\n';
    
    // Winning patterns
    if (insights.winningPatterns && insights.winningPatterns.length > 0) {
      context += '\nProven Winning Patterns:\n';
      insights.winningPatterns.forEach((p: any) => {
        context += `- ${p.pattern}: ${p.winRate.toFixed(1)}% win rate, ${p.avgReturn.toFixed(1)}% avg return (${p.count} trades)\n`;
      });
    }
    
    // Losing patterns
    if (insights.losingPatterns && insights.losingPatterns.length > 0) {
      context += '\nPatterns to Avoid:\n';
      insights.losingPatterns.forEach((p: any) => {
        context += `- ${p.pattern}: ${p.winRate.toFixed(1)}% win rate (${p.count} trades) - AVOID\n`;
      });
    }
    
    // Optimal thresholds
    if (insights.optimalThresholds) {
      context += '\nOptimal Thresholds (from data):\n';
      context += `- Minimum Overall Score: ${insights.optimalThresholds.minOverallScore}\n`;
      context += `- Minimum Business Quality: ${insights.optimalThresholds.minBusinessQuality}\n`;
    }
    
    // Recommendations
    if (insights.recommendations && insights.recommendations.length > 0) {
      context += '\nKey Recommendations:\n';
      insights.recommendations.forEach((r: string) => {
        context += `- ${r}\n`;
      });
    }
    
    return context;
  }

  /**
   * Build analysis prompt with pattern learning
   */
  private buildAnalysisPrompt(
    entries: any[], 
    historicalInsights: string,
    patternContext: string,
    patternInsights: any
  ): string {
    const entriesText = entries.map(e => 
      `[${e.source_type}] ${e.ai_summary} | Tickers: ${(e.tickers || []).join(', ')} | Sentiment: ${e.ai_sentiment} | Score: ${e.ai_relevance_score}`
    ).join('\n');

    const minBusinessQuality = patternInsights?.optimalThresholds?.minBusinessQuality || 15;

    return `You are a professional stock analyst with access to proven winning patterns from historical performance.

${historicalInsights}

${patternContext}

MARKET INTELLIGENCE DATA (Last 7 Days):
${entriesText}

TASK: Identify the top 5 trading opportunities that match our PROVEN winning patterns.

CRITICAL - PATTERN MATCHING:
${patternInsights ? `
- Your historical data shows winning patterns - FOLLOW THEM EXACTLY
- Business Quality ≥${minBusinessQuality} is critical for wins
- Focus on patterns that achieved 70%+ win rates historically
- Avoid patterns that historically failed
` : `
- Focus on business quality (moat) as primary driver
- Healthcare sector has shown 83% historical win rate
- Established tech with strong fundamentals performs well
`}

For each opportunity, provide:
1. Ticker symbol
2. Company name
3. Action: BUY, SELL, or WATCH
4. Confidence: 0-100 (only recommend if >75)
5. Reasoning: WHY this matches proven winning patterns
6. Catalysts: 2-4 specific upcoming events
7. Predicted gain %: Estimate for next 7 days
8. Risk factors: 2-3 key risks
9. Time horizon: "1-3 days", "3-7 days", or "1-2 weeks"

IMPORTANT:
- Match patterns that ACTUALLY worked historically
- Business quality (moat) is most predictive dimension
- Be selective - quality over quantity
- Reference specific winning patterns in reasoning

Respond ONLY with valid JSON in this exact format:
{
  "signals": [
    {
      "ticker": "NVDA",
      "companyName": "NVIDIA Corporation",
      "action": "BUY",
      "confidence": 85,
      "reasoning": "Matches proven 'High Business Quality' pattern that achieved 85% win rate. Dominant moat through CUDA ecosystem similar to past winners.",
      "catalysts": ["Earnings next week", "New product launch"],
      "predictedGainPct": 8.5,
      "riskFactors": ["Volatility", "Competition"],
      "timeHorizon": "3-7 days"
    }
  ]
}`;
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
   * Save signal to ai_tip_tracker with success probability
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
          success_probability,
          created_by
        ) VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
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
        signal.catalysts,
        signal.riskFactors,
        signal.timeHorizon,
        signal.analysisScore || null,
        signal.successProbability ? (signal.successProbability * 100).toFixed(1) : null,
        'AI_SYSTEM_PHASE4'
      ]);
      
      console.log(`  ✓ Saved ${signal.ticker} (Analysis: ${signal.analysisScore}/100, Probability: ${signal.successProbability ? (signal.successProbability * 100).toFixed(1) : 'N/A'}%)`);
      
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

export default new SignalGeneratorServicePhase4();
