// src/services/aiAnalysisEngine.ts
// PHASE 6 + 7: Claude AI analyzes ALL data including institutional, enhanced political, and technical

import Anthropic from '@anthropic-ai/sdk';

interface AnalysisInput {
  politicalTrades: any[];
  insiderActivity: any[];
  news: any[];
  socialSentiment: any[];
  economicEvents: any[];
  // PHASE 7: New data types
  institutional?: any[];
  enhancedPolitical?: any[];
  technical?: any[];
  // PHASE 8: New data types
  crypto?: any[];
  earnings?: any[];
  macro?: any[];
  enhancedSocial?: any[];
}

interface Opportunity {
  ticker: string;
  action: 'BUY' | 'SELL' | 'WATCH';
  confidence: number;
  reasoning: string;
  signals: string[];
  targetPrice?: number;
  stopLoss?: number;
  timeframe: string;
  catalysts: string[];
  risks: string[];
}

interface MarketAnalysis {
  opportunities: Opportunity[];
  risks: any[];
  marketSentiment: 'bullish' | 'bearish' | 'neutral';
  keyInsights: string[];
  timestamp: string;
}

class AIAnalysisEngine {
  private anthropic: Anthropic;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }
    this.anthropic = new Anthropic({ apiKey });
  }

  /**
   * MASTER ANALYSIS: Analyze all data with Claude AI
   */
  async analyzeMarketData(input: AnalysisInput): Promise<MarketAnalysis> {
    console.log('🧠 Starting AI market analysis...');
    
    try {
      // Build comprehensive prompt
      const prompt = this.buildAnalysisPrompt(input);
      
      // Send to Claude for analysis
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        temperature: 0.7,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      // Parse Claude's response
      const analysis = this.parseClaudeResponse(response);
      
      console.log(`✅ AI Analysis complete: ${analysis.opportunities.length} opportunities found`);
      
      return analysis;
      
    } catch (error: any) {
      console.error('❌ AI Analysis error:', error.message);
      
      // Return fallback analysis if Claude fails
      return this.generateFallbackAnalysis(input);
    }
  }

  /**
   * Build sophisticated analysis prompt for Claude
   */
  private buildAnalysisPrompt(input: AnalysisInput): string {
    const { politicalTrades, insiderActivity, news, socialSentiment, economicEvents, institutional, enhancedPolitical, technical, crypto, earnings, macro, enhancedSocial } = input;

    return `You are an elite market analyst with access to comprehensive market intelligence. Analyze the following data and provide actionable investment opportunities.

# MARKET INTELLIGENCE DATA

## Political Trades (Congressional Stock Purchases)
${this.formatPoliticalTrades(politicalTrades)}

## Insider Activity (SEC Form 4 Filings)
${this.formatInsiderActivity(insiderActivity)}

## Institutional Activity (13F Filings, Whale Trades, Short Interest)
${this.formatInstitutional(institutional || [])}

## Enhanced Political Intelligence (Committees, Lobbying, Contributions, Votes)
${this.formatEnhancedPolitical(enhancedPolitical || [])}

## Technical Analysis (RSI, MACD, Patterns, Volume)
${this.formatTechnical(technical || [])}

## Crypto Intelligence (Whale Movements, Exchange Flows, Sentiment, Correlations)
${this.formatCrypto(crypto || [])}

## Earnings Intelligence (Calendar, Estimates, Surprises, Patterns)
${this.formatEarnings(earnings || [])}

## Macro Intelligence (Fed, Yields, Dollar, Commodities, Global Markets)
${this.formatMacro(macro || [])}

## Enhanced Social Intelligence (Twitter, StockTwits, Discord)
${this.formatEnhancedSocial(enhancedSocial || [])}

## Market News (Recent 24-48 hours)
${this.formatNews(news)}

## Social Sentiment (Reddit, Twitter, Truth Social)
${this.formatSocialSentiment(socialSentiment)}

## Economic Calendar (Upcoming Events)
${this.formatEconomicEvents(economicEvents)}

---

# YOUR TASK

Analyze ALL the data above and identify the TOP 3-5 investment opportunities. For each opportunity:

1. **Find Multi-Source Correlations:** Look for patterns across multiple data types
   - Example: "Pelosi bought NVDA + Berkshire increased NVDA (13F) + Whale trade + RSI bullish + Earnings in 3 days (80% beat rate) + Fed dovish = 94% confidence"
   - Example: "BTC whale selling 5K BTC to exchange + MSTR correlation 92% + Technical support broken = Watch MSTR for weakness"
   - Example: "Oil spiking +2.3% + Dollar weakening + Fed dovish = Rotation to energy, commodities"

2. **Weight Signal Strength by Source Quality:**
   - Institutional (13F, whale trades): High weight (smart money)
   - Political + Committee correlation: High weight (insider knowledge)
   - Earnings (beat patterns, estimate revisions): High weight (fundamental catalyst)
   - Macro (Fed signals, yields): High weight (market direction)
   - Technical + Volume: Medium weight (timing signals)
   - Crypto correlation: Medium weight (cross-asset signal)
   - Social sentiment alone: Low weight (noise)
   - Multiple confirming signals: Exponentially higher confidence

3. **Assess Confidence Based on Signal Convergence:**
   - 1-2 signals = 40-60% confidence
   - 3-4 signals = 60-75% confidence
   - 5-6 signals = 75-85% confidence
   - 7+ signals from different categories = 85-95% confidence
   - Conflicting signals = Lower confidence significantly

4. **Identify Multi-Factor Catalysts:**
   - Upcoming events (earnings, Fed meetings, votes)
   - Recent institutional activity
   - Technical breakouts
   - Sentiment shifts
   - Macro tailwinds/headwinds

5. **Evaluate Comprehensive Risks:**
   - Economic headwinds (Fed, yields, dollar)
   - Technical resistance
   - Institutional selling
   - Regulatory issues
   - Crypto correlation risks
   - Earnings miss potential

# OUTPUT FORMAT

Respond with a JSON object (no markdown, just pure JSON):

{
  "opportunities": [
    {
      "ticker": "NVDA",
      "action": "BUY",
      "confidence": 94,
      "reasoning": "Exceptional 9-source confluence: Nancy Pelosi purchased (political), Berkshire Hathaway increased 13F +5.2% (institutional), whale trade 2.5M shares at $495 (institutional), Senator on Tech Committee voted YES on AI bill (enhanced political), RSI 68 bullish (technical), Cup & Handle pattern (technical), Earnings in 3 days with 80% beat rate (earnings), Analyst estimates revised UP +10.3% (earnings), Fed dovish tone positive for growth (macro). Nine independent signals align bullishly.",
      "signals": [
        "Political: Nancy Pelosi purchased $500K",
        "Institutional: Berkshire increased 13F +5.2%",
        "Institutional: Whale trade 2.5M shares at $495",
        "Enhanced Political: Tech Committee Senator voted YES on AI bill",
        "Technical: RSI 68 (bullish momentum)",
        "Technical: Cup & Handle pattern forming",
        "Earnings: Reports in 3 days, 80% historical beat rate",
        "Earnings: Analyst estimates revised UP +10.3%",
        "Macro: Fed dovish = positive for growth stocks"
      ],
      "targetPrice": 550,
      "stopLoss": 475,
      "timeframe": "2-4 weeks",
      "catalysts": [
        "AI chip demand accelerating (multiple data points)",
        "Institutional accumulation pattern",
        "Technical breakout above $495 resistance",
        "Earnings likely beat based on historical pattern"
      ],
      "risks": [
        "Overbought RSI could trigger short-term pullback",
        "Fed meeting this week may cause volatility",
        "High valuation (P/E 65x)"
      ]
    }
  ],
  "risks": [
    {
      "type": "Market Risk",
      "description": "Fed meeting this week could trigger volatility across all positions",
      "severity": "HIGH",
      "mitigation": "Reduce position sizes, use stop losses, wait for post-FOMC clarity"
    }
  ],
  "marketSentiment": "bullish",
  "keyInsights": [
    "Unusual institutional accumulation in tech sector (13F + whale trades)",
    "Political insiders on Tech Committees showing conviction (purchases + votes)",
    "Technical indicators suggest continued momentum with minor overbought concerns",
    "Earnings season setup: Multiple companies with high beat rates reporting soon",
    "Macro environment: Fed dovish, yields falling = positive for growth/tech"
  ]
}

CRITICAL RULES:
- Only recommend opportunities with confidence > 60%
- MUST cite specific data points from multiple sources
- Explain why signals converge or conflict
- If institutional selling contradicts other signals, explain and lower confidence
- Focus on actionable, timely opportunities with clear entry/exit
- Always provide risk mitigation strategies
- Consider macro context (Fed, yields, dollar) for all recommendations

Begin your analysis:`;
  }

  /**
   * Format institutional data (PHASE 7)
   */
  private formatInstitutional(data: any[]): string {
    if (!data || data.length === 0) {
      return 'No institutional activity data available.';
    }

    return data.slice(0, 10).map(item =>
      `- [${item.source}] ${item.title}\n  ${item.content}\n  Sentiment: ${item.sentiment || 'neutral'}`
    ).join('\n\n');
  }

  /**
   * Format enhanced political data (PHASE 7)
   */
  private formatEnhancedPolitical(data: any[]): string {
    if (!data || data.length === 0) {
      return 'No enhanced political intelligence available.';
    }

    return data.slice(0, 10).map(item =>
      `- [${item.source}] ${item.title}\n  ${item.content}\n  ${item.politician ? `Politician: ${item.politician}` : ''}`
    ).join('\n\n');
  }

  /**
   * Format technical signals (PHASE 7)
   */
  private formatTechnical(data: any[]): string {
    if (!data || data.length === 0) {
      return 'No technical analysis signals available.';
    }

    // Group by ticker
    const byTicker = data.reduce((acc: any, item: any) => {
      if (!acc[item.ticker]) {
        acc[item.ticker] = [];
      }
      acc[item.ticker].push(item);
      return acc;
    }, {});

    return Object.entries(byTicker).map(([ticker, signals]: [string, any]) => {
      const signalList = signals.map((s: any) => `  - ${s.title}: ${s.content}`).join('\n');
      return `**${ticker}:**\n${signalList}`;
    }).join('\n\n');
  }

  /**
   * Format crypto intelligence (PHASE 8)
   */
  private formatCrypto(data: any[]): string {
    if (!data || data.length === 0) {
      return 'No crypto intelligence available.';
    }

    return data.slice(0, 10).map(item =>
      `- [${item.source}] ${item.title}\n  ${item.content}\n  ${item.crypto ? `Crypto: ${item.crypto}` : ''} ${item.ticker ? `Related Stock: ${item.ticker}` : ''}`
    ).join('\n\n');
  }

  /**
   * Format earnings intelligence (PHASE 8)
   */
  private formatEarnings(data: any[]): string {
    if (!data || data.length === 0) {
      return 'No earnings intelligence available.';
    }

    return data.slice(0, 10).map(item =>
      `- [${item.source}] ${item.title}\n  ${item.content}\n  Ticker: ${item.ticker}`
    ).join('\n\n');
  }

  /**
   * Format macro intelligence (PHASE 8)
   */
  private formatMacro(data: any[]): string {
    if (!data || data.length === 0) {
      return 'No macro intelligence available.';
    }

    return data.slice(0, 10).map(item =>
      `- [${item.source}] ${item.title}\n  ${item.content}\n  Sentiment: ${item.sentiment || 'neutral'}`
    ).join('\n\n');
  }

  /**
   * Format enhanced social (PHASE 8)
   */
  private formatEnhancedSocial(data: any[]): string {
    if (!data || data.length === 0) {
      return 'No enhanced social intelligence available.';
    }

    return data.slice(0, 10).map(item =>
      `- [${item.source}] ${item.title}\n  ${item.content}${item.ticker ? `\n  Ticker: ${item.ticker}` : ''}`
    ).join('\n\n');
  }

  /**
   * Format political trades for prompt
   */
  private formatPoliticalTrades(trades: any[]): string {
    if (!trades || trades.length === 0) {
      return 'No recent political trades available.';
    }

    return trades.slice(0, 10).map(trade => 
      `- ${trade.politician || 'Unknown'}: ${trade.sentiment?.toUpperCase()} ${trade.ticker || 'Unknown'} (${new Date(trade.timestamp).toLocaleDateString()})\n  "${trade.content}"`
    ).join('\n\n');
  }

  /**
   * Format insider activity for prompt
   */
  private formatInsiderActivity(activity: any[]): string {
    if (!activity || activity.length === 0) {
      return 'No recent insider activity available.';
    }

    return activity.slice(0, 10).map(item =>
      `- ${item.insider || 'Insider'}: ${item.sentiment?.toUpperCase()} ${item.ticker || 'Unknown'} (${new Date(item.timestamp).toLocaleDateString()})\n  "${item.content}"`
    ).join('\n\n');
  }

  /**
   * Format news for prompt
   */
  private formatNews(news: any[]): string {
    if (!news || news.length === 0) {
      return 'No recent news available.';
    }

    return news.slice(0, 15).map(article =>
      `- [${article.source}] ${article.title}\n  ${article.content.substring(0, 150)}...${article.ticker ? ` (Ticker: ${article.ticker})` : ''}`
    ).join('\n\n');
  }

  /**
   * Format social sentiment for prompt
   */
  private formatSocialSentiment(social: any[]): string {
    if (!social || social.length === 0) {
      return 'No social sentiment data available.';
    }

    return social.slice(0, 10).map(post =>
      `- [${post.source}] ${post.title}\n  ${post.content.substring(0, 100)}...`
    ).join('\n\n');
  }

  /**
   * Format economic events for prompt
   */
  private formatEconomicEvents(events: any[]): string {
    if (!events || events.length === 0) {
      return 'No upcoming economic events.';
    }

    return events.map(event =>
      `- ${new Date(event.timestamp).toLocaleDateString()}: ${event.title}\n  ${event.content}`
    ).join('\n\n');
  }

  /**
   * Parse Claude's JSON response
   */
  private parseClaudeResponse(response: any): MarketAnalysis {
    try {
      const text = response.content[0].text;
      
      const cleanText = text
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      const parsed = JSON.parse(cleanText);
      
      return {
        opportunities: parsed.opportunities || [],
        risks: parsed.risks || [],
        marketSentiment: parsed.marketSentiment || 'neutral',
        keyInsights: parsed.keyInsights || [],
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Failed to parse Claude response:', error);
      throw error;
    }
  }

  /**
   * Fallback analysis if Claude fails
   */
  private generateFallbackAnalysis(input: AnalysisInput): MarketAnalysis {
    console.warn('⚠️ Using fallback analysis (Claude unavailable)');
    
    const opportunities: Opportunity[] = [];
    
    // Aggregate signals by ticker
    const tickerSignals = new Map<string, any>();
    
    [...input.politicalTrades, ...input.insiderActivity, ...input.news, ...(input.institutional || []), ...(input.technical || [])].forEach(item => {
      if (item.ticker) {
        if (!tickerSignals.has(item.ticker)) {
          tickerSignals.set(item.ticker, { ticker: item.ticker, signals: [], sentiment: [] });
        }
        
        const data = tickerSignals.get(item.ticker);
        data.signals.push(item.type);
        if (item.sentiment) {
          data.sentiment.push(item.sentiment);
        }
      }
    });
    
    // Generate opportunities for tickers with multiple signals
    tickerSignals.forEach((data, ticker) => {
      if (data.signals.length >= 2) {
        const bullishCount = data.sentiment.filter((s: string) => s === 'bullish').length;
        const confidence = Math.min(95, 50 + (data.signals.length * 10) + (bullishCount * 5));
        
        opportunities.push({
          ticker: ticker,
          action: bullishCount > data.sentiment.length / 2 ? 'BUY' : 'WATCH',
          confidence: confidence,
          reasoning: `Multiple signals detected: ${data.signals.length} data points with ${bullishCount} bullish indicators across ${data.signals.join(', ')}.`,
          signals: data.signals.map((s: string) => `${s} activity detected`),
          timeframe: '1-2 weeks',
          catalysts: ['Multiple data source confirmation'],
          risks: ['Market volatility', 'Limited AI analysis (fallback mode)']
        });
      }
    });
    
    return {
      opportunities: opportunities.slice(0, 5),
      risks: [{
        type: 'System',
        description: 'AI analysis temporarily unavailable - using rule-based fallback',
        severity: 'MEDIUM'
      }],
      marketSentiment: 'neutral',
      keyInsights: [
        `Analyzing ${input.politicalTrades.length} political trades`,
        `Tracking ${input.insiderActivity.length} insider transactions`,
        `Monitoring ${input.news.length} news articles`,
        `Phase 7: ${(input.institutional || []).length} institutional signals`,
        `Phase 7: ${(input.technical || []).length} technical signals`,
        `Phase 8: ${(input.crypto || []).length} crypto signals`,
        `Phase 8: ${(input.earnings || []).length} earnings signals`,
        `Phase 8: ${(input.macro || []).length} macro signals`,
        `Phase 8: ${(input.enhancedSocial || []).length} enhanced social signals`
      ],
      timestamp: new Date().toISOString()
    };
  }
}

export default new AIAnalysisEngine();
