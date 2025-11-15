// backend/src/services/comprehensiveBusinessAnalysis.ts
// Phase 3: Complete 8-Dimension Investment Analysis
// Inspired by Buffett, Cathie Wood, Ackman methodologies

import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const FMP_API_KEY = process.env.FMP_API_KEY; // Financial Modeling Prep
const FMP_BASE = 'https://financialmodelingprep.com/api/v3';

interface ComprehensiveAnalysis {
  ticker: string;
  overallScore: number;
  recommendation: string;
  
  // 8 Dimensions
  executiveQuality: DimensionScore;
  businessQuality: DimensionScore;
  financialStrength: DimensionScore;
  industryPosition: DimensionScore;
  growthPotential: DimensionScore;
  valuation: DimensionScore;
  catalysts: DimensionScore;
  riskAssessment: DimensionScore;
  
  // Summary
  strengths: string[];
  concerns: string[];
  investmentThesis: string;
  comparison: string;
}

interface DimensionScore {
  score: number;
  maxScore: number;
  reasoning: string;
  details: string[];
}

class ComprehensiveBusinessAnalysisService {
  /**
   * Analyze a company across all 8 dimensions
   */
  async analyzeCompany(ticker: string, historicalContext?: string): Promise<ComprehensiveAnalysis> {
    console.log(`\n🔍 === COMPREHENSIVE ANALYSIS: ${ticker} ===\n`);
    
    try {
      // Step 1: Gather ALL available data
      console.log('📊 Step 1: Gathering comprehensive data...');
      const data = await this.gatherAllData(ticker);
      
      // Step 2: Use Claude to analyze each dimension
      console.log('🧠 Step 2: AI analysis of all dimensions...');
      const analysis = await this.performClaudeAnalysis(ticker, data, historicalContext);
      
      console.log(`✅ Analysis complete: ${analysis.overallScore}/100\n`);
      return analysis;
      
    } catch (error) {
      console.error(`❌ Analysis failed for ${ticker}:`, error);
      throw error;
    }
  }

  /**
   * Gather all available data from FMP and other sources
   */
  private async gatherAllData(ticker: string): Promise<any> {
    const data: any = {
      ticker,
      hasData: false
    };

    try {
      // Company Profile
      const profile = await this.fmpGet(`/profile/${ticker}`);
      if (profile && profile[0]) {
        data.profile = profile[0];
        data.hasData = true;
      }

      // Key Executives
      const executives = await this.fmpGet(`/key-executives/${ticker}`);
      if (executives && executives.length > 0) {
        data.executives = executives;
      }

      // Insider Trading (last 6 months)
      const insiders = await this.fmpGet(`/insider-trading?symbol=${ticker}&limit=100`);
      if (insiders && insiders.length > 0) {
        data.insiders = insiders;
      }

      // Financial Ratios
      const ratios = await this.fmpGet(`/ratios/${ticker}?limit=1`);
      if (ratios && ratios[0]) {
        data.ratios = ratios[0];
      }

      // Key Metrics
      const metrics = await this.fmpGet(`/key-metrics/${ticker}?limit=1`);
      if (metrics && metrics[0]) {
        data.metrics = metrics[0];
      }

      // Financial Growth
      const growth = await this.fmpGet(`/financial-growth/${ticker}?limit=1`);
      if (growth && growth[0]) {
        data.growth = growth[0];
      }

      // Income Statement
      const income = await this.fmpGet(`/income-statement/${ticker}?limit=1`);
      if (income && income[0]) {
        data.income = income[0];
      }

      // Balance Sheet
      const balance = await this.fmpGet(`/balance-sheet-statement/${ticker}?limit=1`);
      if (balance && balance[0]) {
        data.balance = balance[0];
      }

      // Cash Flow
      const cashFlow = await this.fmpGet(`/cash-flow-statement/${ticker}?limit=1`);
      if (cashFlow && cashFlow[0]) {
        data.cashFlow = cashFlow[0];
      }

      // Institutional Holders
      const institutional = await this.fmpGet(`/institutional-holder/${ticker}`);
      if (institutional && institutional.length > 0) {
        data.institutional = institutional.slice(0, 10);
      }

      console.log(`  ✓ Gathered data for ${ticker}`);
      console.log(`    - Profile: ${data.profile ? 'Yes' : 'No'}`);
      console.log(`    - Executives: ${data.executives ? data.executives.length : 0}`);
      console.log(`    - Insiders: ${data.insiders ? data.insiders.length : 0}`);
      console.log(`    - Financials: ${data.ratios ? 'Yes' : 'No'}`);

      return data;

    } catch (error) {
      console.error(`Error gathering data:`, error);
      return data;
    }
  }

  /**
   * Make FMP API request
   */
  private async fmpGet(endpoint: string): Promise<any> {
    try {
      const url = `${FMP_BASE}${endpoint}${endpoint.includes('?') ? '&' : '?'}apikey=${FMP_API_KEY}`;
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.log(`  ⚠️ FMP request failed: ${endpoint}`);
      return null;
    }
  }

  /**
   * Use Claude to perform comprehensive analysis
   */
  private async performClaudeAnalysis(
    ticker: string,
    data: any,
    historicalContext?: string
  ): Promise<ComprehensiveAnalysis> {
    
    // Build comprehensive prompt
    const prompt = this.buildAnalysisPrompt(ticker, data, historicalContext);
    
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const responseText = message.content[0].type === 'text' 
      ? message.content[0].text 
      : '';

    // Parse Claude's analysis
    return this.parseAnalysis(ticker, responseText);
  }

  /**
   * Build comprehensive analysis prompt for Claude
   */
  private buildAnalysisPrompt(ticker: string, data: any, historicalContext?: string): string {
    const dataText = this.formatDataForPrompt(data);
    
    return `You are a world-class investment analyst combining the methodologies of Warren Buffett (value + moat), Cathie Wood (innovation + disruption), and Bill Ackman (quality + catalysts).

Analyze ${ticker} across 8 critical investment dimensions. Be RIGOROUS - only great companies should score 80+.

${historicalContext ? `\nHISTORICAL CONTEXT:\n${historicalContext}\n` : ''}

COMPANY DATA:
${dataText}

TASK: Provide a comprehensive investment analysis scoring each dimension:

1. EXECUTIVE QUALITY (0-15 points)
   - CEO/CFO track record and tenure
   - Board composition and independence
   - Insider ownership and recent transactions
   - Management execution history
   - Capital allocation decisions

2. BUSINESS QUALITY (0-20 points) [MOST IMPORTANT]
   - Economic moat (Buffett): pricing power, brand, network effects, switching costs
   - Competitive advantages: What makes this business defensible?
   - Market position: Leader or follower?
   - Business model strength
   - Customer retention and loyalty

3. FINANCIAL STRENGTH (0-15 points)
   - Cash flow generation (operating cash flow)
   - Balance sheet health (debt levels, liquidity)
   - Profitability margins (gross, operating, net)
   - Return on capital (ROE, ROIC)
   - Financial stability

4. INDUSTRY POSITION (0-10 points)
   - Market share and competitive rank
   - Industry growth trajectory
   - Competitive intensity
   - Regulatory environment
   - Industry tailwinds/headwinds

5. GROWTH POTENTIAL (0-15 points)
   - Revenue growth rates (historical + projected)
   - Total addressable market (TAM) expansion
   - New products/markets/opportunities
   - Scalability of business model
   - Innovation pipeline

6. VALUATION (0-10 points)
   - Price vs peers (P/E, P/S, EV/EBITDA)
   - Price vs historical average
   - Growth-adjusted valuation (PEG ratio)
   - Margin of safety
   - Is the price reasonable for quality?

7. CATALYSTS & MOMENTUM (0-10 points)
   - Upcoming events (earnings, product launches)
   - Insider buying activity
   - Institutional accumulation
   - Technical momentum
   - News sentiment and market attention

8. RISK ASSESSMENT (0-5 points)
   - Key vulnerabilities (debt, competition, disruption)
   - Regulatory/political risks
   - Industry disruption threats
   - Downside scenarios
   - What could go wrong?

CRITICAL INSTRUCTIONS:
- Be HONEST and RIGOROUS. Don't inflate scores.
- Missing data should NOT automatically lower scores - analyze what IS available
- Compare to industry standards, not absolute perfection
- A "good" company should score 65-75, "great" 75-85, "exceptional" 85+
- Focus on WHAT MATTERS for this specific business/industry
- Consider the historical context - what patterns led to winners vs losers?

Respond ONLY with valid JSON:
{
  "executiveQuality": {
    "score": 12,
    "reasoning": "CEO has 10yr tenure with strong execution. Board 80% independent. Recent insider buying of $5M signals confidence.",
    "details": ["Strong CEO track record", "Independent board", "Insider buying"]
  },
  "businessQuality": {
    "score": 18,
    "reasoning": "Dominant moat through network effects and high switching costs. 70% market share in growing category. Strong pricing power.",
    "details": ["Network effects moat", "Market leader", "Pricing power"]
  },
  "financialStrength": {
    "score": 14,
    "reasoning": "Strong $10B operating cash flow. Conservative debt at 0.3x equity. 45% operating margins indicate efficiency.",
    "details": ["Strong cash generation", "Low debt", "High margins"]
  },
  "industryPosition": {
    "score": 9,
    "reasoning": "Clear #1 player in fast-growing AI chip market. Limited real competition. Industry TAM growing 40% annually.",
    "details": ["Market leader", "Growing industry", "Limited competition"]
  },
  "growthPotential": {
    "score": 15,
    "reasoning": "Revenue growing 265% YoY. Expanding into new markets (automotive, robotics). TAM expanding from $30B to $1T.",
    "details": ["Explosive revenue growth", "Market expansion", "New opportunities"]
  },
  "valuation": {
    "score": 7,
    "reasoning": "P/E of 65x is premium but PEG of 0.8 suggests reasonable for growth rate. Trading above historical average.",
    "details": ["Premium valuation", "Justified by growth", "Some downside risk"]
  },
  "catalysts": {
    "score": 9,
    "reasoning": "Earnings in 3 days. New product launch next month. Heavy institutional buying. Strong momentum.",
    "details": ["Near-term earnings", "Product launch", "Institutional buying"]
  },
  "riskAssessment": {
    "score": 4,
    "reasoning": "Main risks: supply chain concentration (TSMC), potential competition from hyperscalers. Strong balance sheet provides cushion.",
    "details": ["Supply chain risk", "Competition threats", "Strong defense"]
  },
  "overallScore": 88,
  "recommendation": "STRONG BUY",
  "strengths": [
    "Dominant market position with strong moat",
    "Explosive growth in massive expanding market",
    "Excellent financial metrics across the board",
    "Clear near-term catalysts"
  ],
  "concerns": [
    "Premium valuation limits margin of safety",
    "Supply chain concentration risk"
  ],
  "investmentThesis": "Exceptional business with dominant moat in rapidly expanding AI market. Despite premium valuation, growth trajectory and competitive position justify investment. Strong match to historical winners with similar profiles.",
  "comparison": "Similar to past winners AAPL and PLTR: tech leader + moat + growth catalysts. These averaged +50% returns."
}`;
  }

  /**
   * Format data for Claude prompt
   */
  private formatDataForPrompt(data: any): string {
    if (!data.hasData) {
      return 'Limited data available. Analyze based on general knowledge and market position.';
    }

    let text = '';

    // Profile
    if (data.profile) {
      const p = data.profile;
      text += `COMPANY PROFILE:\n`;
      text += `- Name: ${p.companyName}\n`;
      text += `- Sector: ${p.sector} | Industry: ${p.industry}\n`;
      text += `- Market Cap: $${(p.mktCap / 1e9).toFixed(2)}B\n`;
      text += `- Description: ${p.description?.substring(0, 300)}...\n\n`;
    }

    // Executives
    if (data.executives && data.executives.length > 0) {
      text += `KEY EXECUTIVES:\n`;
      data.executives.slice(0, 5).forEach((exec: any) => {
        text += `- ${exec.title}: ${exec.name}${exec.pay ? ` (Pay: $${(exec.pay / 1e6).toFixed(1)}M)` : ''}\n`;
      });
      text += '\n';
    }

    // Insider Trading
    if (data.insiders && data.insiders.length > 0) {
      const recentInsiders = data.insiders.slice(0, 10);
      const buying = recentInsiders.filter((i: any) => i.transactionType === 'P-Purchase').length;
      const selling = recentInsiders.filter((i: any) => i.transactionType === 'S-Sale').length;
      
      text += `INSIDER ACTIVITY (Last 6 months):\n`;
      text += `- Purchases: ${buying} | Sales: ${selling}\n`;
      
      if (buying > 0) {
        const topBuys = recentInsiders
          .filter((i: any) => i.transactionType === 'P-Purchase')
          .slice(0, 3);
        text += `- Top Purchases:\n`;
        topBuys.forEach((i: any) => {
          text += `  * ${i.reportingName}: ${i.securitiesTransacted} shares at $${i.price}\n`;
        });
      }
      text += '\n';
    }

    // Financial Ratios
    if (data.ratios) {
      const r = data.ratios;
      text += `FINANCIAL RATIOS:\n`;
      text += `- P/E: ${r.priceEarningsRatio?.toFixed(2) || 'N/A'}\n`;
      text += `- P/B: ${r.priceToBookRatio?.toFixed(2) || 'N/A'}\n`;
      text += `- Debt/Equity: ${r.debtEquityRatio?.toFixed(2) || 'N/A'}\n`;
      text += `- Current Ratio: ${r.currentRatio?.toFixed(2) || 'N/A'}\n`;
      text += `- ROE: ${(r.returnOnEquity * 100)?.toFixed(2) || 'N/A'}%\n`;
      text += `- ROA: ${(r.returnOnAssets * 100)?.toFixed(2) || 'N/A'}%\n`;
      text += `- Gross Margin: ${(r.grossProfitMargin * 100)?.toFixed(2) || 'N/A'}%\n`;
      text += `- Operating Margin: ${(r.operatingProfitMargin * 100)?.toFixed(2) || 'N/A'}%\n`;
      text += `- Net Margin: ${(r.netProfitMargin * 100)?.toFixed(2) || 'N/A'}%\n\n`;
    }

    // Growth Metrics
    if (data.growth) {
      const g = data.growth;
      text += `GROWTH METRICS:\n`;
      text += `- Revenue Growth: ${(g.revenueGrowth * 100)?.toFixed(2) || 'N/A'}%\n`;
      text += `- Gross Profit Growth: ${(g.grossProfitGrowth * 100)?.toFixed(2) || 'N/A'}%\n`;
      text += `- Operating Income Growth: ${(g.operatingIncomeGrowth * 100)?.toFixed(2) || 'N/A'}%\n`;
      text += `- Net Income Growth: ${(g.netIncomeGrowth * 100)?.toFixed(2) || 'N/A'}%\n\n`;
    }

    // Key Metrics
    if (data.metrics) {
      const m = data.metrics;
      text += `KEY METRICS:\n`;
      text += `- Market Cap: $${(m.marketCap / 1e9)?.toFixed(2) || 'N/A'}B\n`;
      text += `- Enterprise Value: $${(m.enterpriseValue / 1e9)?.toFixed(2) || 'N/A'}B\n`;
      text += `- P/E: ${m.peRatio?.toFixed(2) || 'N/A'}\n`;
      text += `- PEG: ${m.pegRatio?.toFixed(2) || 'N/A'}\n`;
      text += `- Price/Sales: ${m.priceToSalesRatio?.toFixed(2) || 'N/A'}\n\n`;
    }

    // Cash Flow
    if (data.cashFlow) {
      const cf = data.cashFlow;
      text += `CASH FLOW:\n`;
      text += `- Operating Cash Flow: $${(cf.operatingCashFlow / 1e9)?.toFixed(2) || 'N/A'}B\n`;
      text += `- Free Cash Flow: $${(cf.freeCashFlow / 1e9)?.toFixed(2) || 'N/A'}B\n`;
      text += `- CapEx: $${(Math.abs(cf.capitalExpenditure) / 1e9)?.toFixed(2) || 'N/A'}B\n\n`;
    }

    // Institutional Holders
    if (data.institutional && data.institutional.length > 0) {
      text += `TOP INSTITUTIONAL HOLDERS:\n`;
      data.institutional.slice(0, 5).forEach((inst: any) => {
        text += `- ${inst.holder}: ${((inst.shares / 1e6) || 0).toFixed(1)}M shares\n`;
      });
      text += '\n';
    }

    return text;
  }

  /**
   * Parse Claude's analysis response
   */
  private parseAnalysis(ticker: string, responseText: string): ComprehensiveAnalysis {
    try {
      const cleanedText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleanedText);
      
      return {
        ticker,
        overallScore: parsed.overallScore,
        recommendation: parsed.recommendation,
        executiveQuality: {
          score: parsed.executiveQuality.score,
          maxScore: 15,
          reasoning: parsed.executiveQuality.reasoning,
          details: parsed.executiveQuality.details
        },
        businessQuality: {
          score: parsed.businessQuality.score,
          maxScore: 20,
          reasoning: parsed.businessQuality.reasoning,
          details: parsed.businessQuality.details
        },
        financialStrength: {
          score: parsed.financialStrength.score,
          maxScore: 15,
          reasoning: parsed.financialStrength.reasoning,
          details: parsed.financialStrength.details
        },
        industryPosition: {
          score: parsed.industryPosition.score,
          maxScore: 10,
          reasoning: parsed.industryPosition.reasoning,
          details: parsed.industryPosition.details
        },
        growthPotential: {
          score: parsed.growthPotential.score,
          maxScore: 15,
          reasoning: parsed.growthPotential.reasoning,
          details: parsed.growthPotential.details
        },
        valuation: {
          score: parsed.valuation.score,
          maxScore: 10,
          reasoning: parsed.valuation.reasoning,
          details: parsed.valuation.details
        },
        catalysts: {
          score: parsed.catalysts.score,
          maxScore: 10,
          reasoning: parsed.catalysts.reasoning,
          details: parsed.catalysts.details
        },
        riskAssessment: {
          score: parsed.riskAssessment.score,
          maxScore: 5,
          reasoning: parsed.riskAssessment.reasoning,
          details: parsed.riskAssessment.details
        },
        strengths: parsed.strengths,
        concerns: parsed.concerns,
        investmentThesis: parsed.investmentThesis,
        comparison: parsed.comparison
      };
      
    } catch (error) {
      console.error('Failed to parse analysis:', error);
      throw new Error('Analysis parsing failed');
    }
  }

  /**
   * Batch analyze multiple companies
   */
  async batchAnalyze(tickers: string[], historicalContext?: string): Promise<Map<string, ComprehensiveAnalysis>> {
    console.log(`\n🔍 Batch analyzing ${tickers.length} companies...\n`);
    
    const results = new Map<string, ComprehensiveAnalysis>();
    
    for (const ticker of tickers) {
      try {
        const analysis = await this.analyzeCompany(ticker, historicalContext);
        results.set(ticker, analysis);
        
        // Rate limiting
        await this.sleep(3000);
      } catch (error) {
        console.error(`Failed to analyze ${ticker}:`, error);
      }
    }
    
    return results;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default new ComprehensiveBusinessAnalysisService();
