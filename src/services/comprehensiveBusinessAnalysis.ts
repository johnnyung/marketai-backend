// backend/src/services/comprehensiveBusinessAnalysis.ts
// Phase 3: Comprehensive 8-Dimension Business Analysis
// UPDATED: Uses NEW FMP API v4 endpoints (post-August 2025)

import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const FMP_API_KEY = process.env.FMP_API_KEY;
const FMP_BASE_URL = 'https://financialmodelingprep.com/api';

interface ComprehensiveAnalysis {
  ticker: string;
  overallScore: number;
  recommendation: string;
  executiveQuality: DimensionScore;
  businessQuality: DimensionScore;
  financialStrength: DimensionScore;
  industryPosition: DimensionScore;
  growthPotential: DimensionScore;
  valuation: DimensionScore;
  catalysts: DimensionScore;
  riskAssessment: DimensionScore;
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

class ComprehensiveBusinessAnalysis {
  /**
   * NEW FMP API: Get company profile
   * v4 endpoint: /v4/company-profile
   */
  private async fetchFMPData(endpoint: string, version: string = 'v3'): Promise<any> {
    if (!FMP_API_KEY) {
      console.log('  ⚠️ FMP_API_KEY not configured, using general knowledge');
      return null;
    }

    try {
      const url = `${FMP_BASE_URL}/${version}${endpoint}`;
      const params = endpoint.includes('?') 
        ? `&apikey=${FMP_API_KEY}`
        : `?apikey=${FMP_API_KEY}`;
      
      const response = await axios.get(`${url}${params}`, {
        timeout: 10000
      });
      
      return response.data;
    } catch (error: any) {
      console.log(`  ⚠️ FMP request failed: ${version}${endpoint}`);
      if (error.response?.status === 403 || error.response?.status === 404) {
        console.log(`     This endpoint may require a different FMP plan or has been deprecated`);
      }
      return null;
    }
  }

  /**
   * Gather comprehensive company data using NEW FMP v4 API
   */
  private async gatherCompanyData(ticker: string): Promise<any> {
    console.log('\n  Step 1: Gathering comprehensive data...');
    
    const data: any = {
      ticker,
      profile: null,
      quote: null,
      executives: [],
      insiders: [],
      ratios: null,
      metrics: null,
      growth: null,
      income: null,
      balance: null,
      cashflow: null,
      institutional: null
    };

    // NEW v4 API: Company Overview (replaces old /profile)
    // Try multiple endpoints since API structure changed
    
    // Try v4 company-outlook (new comprehensive endpoint)
    const outlook = await this.fetchFMPData(`/company-outlook?symbol=${ticker}`, 'v4');
    if (outlook?.profile) {
      data.profile = outlook.profile;
      console.log(`    - Profile: Yes (v4)`);
    }
    
    // Try v3 profile as fallback
    if (!data.profile) {
      const profileV3 = await this.fetchFMPData(`/profile/${ticker}`, 'v3');
      if (profileV3 && Array.isArray(profileV3) && profileV3.length > 0) {
        data.profile = profileV3[0];
        console.log(`    - Profile: Yes (v3)`);
      }
    }

    // Real-time quote (v3 - still works)
    const quote = await this.fetchFMPData(`/quote/${ticker}`, 'v3');
    if (quote && Array.isArray(quote) && quote.length > 0) {
      data.quote = quote[0];
      console.log(`    - Quote: Yes`);
    }

    // Key executives (v3 or v4)
    const executives = await this.fetchFMPData(`/key-executives/${ticker}`, 'v3');
    if (executives && Array.isArray(executives)) {
      data.executives = executives.slice(0, 5);
      console.log(`    - Executives: ${executives.length}`);
    }

    // Insider trading (v4 has new structure)
    const insiders = await this.fetchFMPData(`/insider-trading?symbol=${ticker}&page=0`, 'v4');
    if (insiders && Array.isArray(insiders)) {
      data.insiders = insiders.slice(0, 10);
      console.log(`    - Insiders: ${insiders.length}`);
    }

    // Financial ratios (TTM)
    const ratios = await this.fetchFMPData(`/ratios-ttm/${ticker}`, 'v3');
    if (ratios && Array.isArray(ratios) && ratios.length > 0) {
      data.ratios = ratios[0];
      console.log(`    - Ratios: Yes`);
    }

    // Key metrics (TTM)
    const metrics = await this.fetchFMPData(`/key-metrics-ttm/${ticker}`, 'v3');
    if (metrics && Array.isArray(metrics) && metrics.length > 0) {
      data.metrics = metrics[0];
      console.log(`    - Metrics: Yes`);
    }

    // Financial growth
    const growth = await this.fetchFMPData(`/financial-growth/${ticker}?limit=1`, 'v3');
    if (growth && Array.isArray(growth) && growth.length > 0) {
      data.growth = growth[0];
      console.log(`    - Growth: Yes`);
    }

    // Income statement (annual)
    const income = await this.fetchFMPData(`/income-statement/${ticker}?limit=1`, 'v3');
    if (income && Array.isArray(income) && income.length > 0) {
      data.income = income[0];
      console.log(`    - Income: Yes`);
    }

    // Balance sheet
    const balance = await this.fetchFMPData(`/balance-sheet-statement/${ticker}?limit=1`, 'v3');
    if (balance && Array.isArray(balance) && balance.length > 0) {
      data.balance = balance[0];
      console.log(`    - Balance: Yes`);
    }

    // Cash flow statement
    const cashflow = await this.fetchFMPData(`/cash-flow-statement/${ticker}?limit=1`, 'v3');
    if (cashflow && Array.isArray(cashflow) && cashflow.length > 0) {
      data.cashflow = cashflow[0];
      console.log(`    - Cashflow: Yes`);
    }

    // Institutional holders
    const institutional = await this.fetchFMPData(`/institutional-holder/${ticker}`, 'v3');
    if (institutional && Array.isArray(institutional)) {
      data.institutional = institutional.slice(0, 10);
      console.log(`    - Institutional: ${institutional.length}`);
    }

    console.log('  ✓ Data gathering complete\n');
    return data;
  }

  /**
   * Comprehensive 8-dimension analysis
   */
  async analyzeCompany(ticker: string, historicalInsights?: string): Promise<ComprehensiveAnalysis> {
    console.log(`\n🔍 === COMPREHENSIVE ANALYSIS: ${ticker} ===`);
    
    try {
      // Step 1: Gather data
      const companyData = await this.gatherCompanyData(ticker);

      // Step 2: Build comprehensive prompt
      console.log('  Step 2: Building analysis prompt...');
      const prompt = this.buildAnalysisPrompt(ticker, companyData, historicalInsights);

      // Step 3: Get Claude's analysis
      console.log('  Step 3: Running comprehensive AI analysis...\n');
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        temperature: 0.3,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const responseText = message.content[0].type === 'text' 
        ? message.content[0].text 
        : '';

      // Step 4: Parse response
      console.log('  Step 4: Parsing analysis...');
      const analysis = this.parseAnalysis(responseText, ticker);
      
      console.log(`\n✅ Analysis complete: ${analysis.overallScore}/100 - ${analysis.recommendation}\n`);
      return analysis;

    } catch (error: any) {
      console.error(`Failed to analyze ${ticker}:`, error.message);
      throw error;
    }
  }

  /**
   * Build comprehensive analysis prompt
   */
  private buildAnalysisPrompt(ticker: string, data: any, historicalInsights?: string): string {
    // Format company data for Claude
    const dataContext = this.formatDataContext(data);
    
    // Add historical performance insights if available
    const performanceContext = historicalInsights || 'No historical performance data available yet.';

    return `You are a professional investment analyst conducting a comprehensive 8-dimension analysis.

COMPANY: ${ticker}

AVAILABLE DATA:
${dataContext}

HISTORICAL PERFORMANCE INSIGHTS:
${performanceContext}

ANALYSIS FRAMEWORK:

You MUST analyze ${ticker} across these 8 dimensions using Buffett, Cathie Wood, and Bill Ackman methodologies:

1. EXECUTIVE QUALITY (0-15 points)
   - CEO/CFO track record and tenure
   - Insider ownership and alignment
   - Capital allocation history
   - Board governance
   Consider: Does management have skin in the game? Proven execution?

2. BUSINESS QUALITY (0-20 points) ⭐ MOST IMPORTANT
   - Economic moat (switching costs, network effects, scale)
   - Pricing power
   - Competitive advantages
   - Market dominance
   Consider: Would Buffett call this a "wonderful business"?

3. FINANCIAL STRENGTH (0-15 points)
   - Balance sheet (debt levels, cash position)
   - Cash flow generation
   - Margins (gross, operating, net)
   - Returns (ROE, ROIC)
   Consider: Financial fortress or house of cards?

4. INDUSTRY POSITION (0-10 points)
   - Market share
   - Industry growth rate
   - Competitive landscape
   - Regulatory environment
   Consider: Leader or follower? Tailwinds or headwinds?

5. GROWTH POTENTIAL (0-15 points)
   - Revenue growth trajectory
   - TAM (Total Addressable Market) expansion
   - New products/markets
   - Scalability
   Consider: Cathie Wood innovation thesis - is this disruptive?

6. VALUATION (0-10 points)
   - P/E ratio vs historical and peers
   - PEG ratio
   - EV/Sales, EV/EBITDA
   - Margin of safety
   Consider: Ackman value - is there upside with limited downside?

7. CATALYSTS (0-10 points)
   - Upcoming earnings/events
   - Product launches
   - Market momentum
   - Institutional interest
   Consider: What could drive the stock higher near-term?

8. RISK ASSESSMENT (0-5 points)
   - Key business risks
   - Competitive threats
   - Regulatory risks
   - Execution risks
   Consider: What could go wrong?

SCORING GUIDELINES:
- Be rigorous and honest
- Use real data when available
- Acknowledge unknowns
- Compare to historical winners/losers
- Business Quality (moat) is MOST predictive

Respond ONLY with valid JSON:
{
  "ticker": "${ticker}",
  "overallScore": 85,
  "recommendation": "BUY/HOLD/SELL/STRONG BUY",
  "executiveQuality": {
    "score": 13,
    "maxScore": 15,
    "reasoning": "Detailed explanation...",
    "details": ["Point 1", "Point 2", "Point 3"]
  },
  "businessQuality": {
    "score": 19,
    "maxScore": 20,
    "reasoning": "Moat analysis...",
    "details": ["Moat factor 1", "Moat factor 2"]
  },
  "financialStrength": {
    "score": 14,
    "maxScore": 15,
    "reasoning": "Financial analysis...",
    "details": ["Strength 1", "Strength 2"]
  },
  "industryPosition": {
    "score": 9,
    "maxScore": 10,
    "reasoning": "Market position...",
    "details": ["Position detail 1", "Position detail 2"]
  },
  "growthPotential": {
    "score": 14,
    "maxScore": 15,
    "reasoning": "Growth analysis...",
    "details": ["Growth driver 1", "Growth driver 2"]
  },
  "valuation": {
    "score": 7,
    "maxScore": 10,
    "reasoning": "Valuation assessment...",
    "details": ["Valuation metric 1", "Valuation metric 2"]
  },
  "catalysts": {
    "score": 8,
    "maxScore": 10,
    "reasoning": "Catalyst analysis...",
    "details": ["Catalyst 1", "Catalyst 2"]
  },
  "riskAssessment": {
    "score": 4,
    "maxScore": 5,
    "reasoning": "Risk analysis...",
    "details": ["Risk 1", "Risk 2"]
  },
  "strengths": [
    "Key strength 1",
    "Key strength 2",
    "Key strength 3",
    "Key strength 4"
  ],
  "concerns": [
    "Key concern 1",
    "Key concern 2",
    "Key concern 3"
  ],
  "investmentThesis": "1-2 paragraph thesis combining Buffett quality, Wood innovation, and Ackman catalyst. Why buy/avoid?",
  "comparison": "Compare to historical winners/losers or similar companies. What pattern does this match?"
}`;
  }

  /**
   * Format company data context for Claude
   */
  private formatDataContext(data: any): string {
    let context = '';

    // Company profile
    if (data.profile) {
      context += `COMPANY PROFILE:
- Name: ${data.profile.companyName || data.profile.symbol}
- Sector: ${data.profile.sector || 'Unknown'}
- Industry: ${data.profile.industry || 'Unknown'}
- Market Cap: $${(data.profile.mktCap / 1e9).toFixed(2)}B
- Description: ${data.profile.description?.substring(0, 300) || 'No description'}
- CEO: ${data.profile.ceo || 'Unknown'}
- Website: ${data.profile.website || 'Unknown'}

`;
    }

    // Current quote
    if (data.quote) {
      context += `CURRENT QUOTE:
- Price: $${data.quote.price}
- Change: ${data.quote.changesPercentage?.toFixed(2)}%
- Volume: ${(data.quote.volume / 1e6).toFixed(2)}M
- Avg Volume: ${(data.quote.avgVolume / 1e6).toFixed(2)}M
- Market Cap: $${(data.quote.marketCap / 1e9).toFixed(2)}B
- P/E Ratio: ${data.quote.pe?.toFixed(2) || 'N/A'}
- 52W High: $${data.quote.yearHigh}
- 52W Low: $${data.quote.yearLow}

`;
    }

    // Executives
    if (data.executives && data.executives.length > 0) {
      context += `KEY EXECUTIVES:\n`;
      data.executives.slice(0, 5).forEach((exec: any) => {
        context += `- ${exec.title}: ${exec.name} (Pay: $${(exec.pay / 1e6).toFixed(1)}M)\n`;
      });
      context += '\n';
    }

    // Financial ratios
    if (data.ratios) {
      context += `FINANCIAL RATIOS (TTM):
- ROE: ${(data.ratios.returnOnEquity * 100).toFixed(2)}%
- ROIC: ${data.ratios.returnOnCapitalEmployed ? (data.ratios.returnOnCapitalEmployed * 100).toFixed(2) + '%' : 'N/A'}
- Gross Margin: ${(data.ratios.grossProfitMargin * 100).toFixed(2)}%
- Operating Margin: ${(data.ratios.operatingProfitMargin * 100).toFixed(2)}%
- Net Margin: ${(data.ratios.netProfitMargin * 100).toFixed(2)}%
- Current Ratio: ${data.ratios.currentRatio?.toFixed(2)}
- Debt/Equity: ${data.ratios.debtEquityRatio?.toFixed(2)}

`;
    }

    // Growth metrics
    if (data.growth) {
      context += `GROWTH METRICS:
- Revenue Growth: ${(data.growth.revenueGrowth * 100).toFixed(2)}%
- Net Income Growth: ${(data.growth.netIncomeGrowth * 100).toFixed(2)}%
- EPS Growth: ${(data.growth.epsgrowth * 100).toFixed(2)}%
- Operating Income Growth: ${(data.growth.operatingIncomeGrowth * 100).toFixed(2)}%

`;
    }

    // Financial statements
    if (data.income) {
      context += `INCOME STATEMENT (Latest Annual):
- Revenue: $${(data.income.revenue / 1e9).toFixed(2)}B
- Operating Income: $${(data.income.operatingIncome / 1e9).toFixed(2)}B
- Net Income: $${(data.income.netIncome / 1e9).toFixed(2)}B
- EPS: $${data.income.eps?.toFixed(2)}

`;
    }

    if (data.balance) {
      context += `BALANCE SHEET (Latest):
- Total Assets: $${(data.balance.totalAssets / 1e9).toFixed(2)}B
- Total Liabilities: $${(data.balance.totalLiabilities / 1e9).toFixed(2)}B
- Total Equity: $${(data.balance.totalEquity / 1e9).toFixed(2)}B
- Cash: $${(data.balance.cashAndCashEquivalents / 1e9).toFixed(2)}B
- Total Debt: $${(data.balance.totalDebt / 1e9).toFixed(2)}B

`;
    }

    if (data.cashflow) {
      context += `CASH FLOW (Latest Annual):
- Operating CF: $${(data.cashflow.operatingCashFlow / 1e9).toFixed(2)}B
- Investing CF: $${(data.cashflow.netCashUsedForInvestingActivites / 1e9).toFixed(2)}B
- Financing CF: $${(data.cashflow.netCashUsedProvidedByFinancingActivities / 1e9).toFixed(2)}B
- Free Cash Flow: $${(data.cashflow.freeCashFlow / 1e9).toFixed(2)}B

`;
    }

    // Insider trading
    if (data.insiders && data.insiders.length > 0) {
      const buyCount = data.insiders.filter((t: any) => t.transactionType?.includes('Buy') || t.transactionType?.includes('P-Purchase')).length;
      const sellCount = data.insiders.filter((t: any) => t.transactionType?.includes('Sale') || t.transactionType?.includes('S-Sale')).length;
      context += `INSIDER TRADING (Recent):
- Total Transactions: ${data.insiders.length}
- Buys: ${buyCount}
- Sells: ${sellCount}
- Net Sentiment: ${buyCount > sellCount ? 'POSITIVE (more buying)' : sellCount > buyCount ? 'NEGATIVE (more selling)' : 'NEUTRAL'}

`;
    }

    // Institutional ownership
    if (data.institutional && data.institutional.length > 0) {
      const totalShares = data.institutional.reduce((sum: number, holder: any) => sum + (holder.shares || 0), 0);
      context += `INSTITUTIONAL OWNERSHIP:
- Top Holders: ${data.institutional.length}
- Total Institutional Shares: ${(totalShares / 1e6).toFixed(2)}M
- Top 3: ${data.institutional.slice(0, 3).map((h: any) => h.investor).join(', ')}

`;
    }

    if (!context) {
      context = `LIMITED DATA AVAILABLE
- Using general knowledge and industry analysis for ${data.ticker}
- FMP API data not available - analysis based on public information
`;
    }

    return context;
  }

  /**
   * Parse Claude's analysis response
   */
  private parseAnalysis(responseText: string, ticker: string): ComprehensiveAnalysis {
    try {
      const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      
      return {
        ticker: parsed.ticker || ticker,
        overallScore: parsed.overallScore,
        recommendation: parsed.recommendation,
        executiveQuality: parsed.executiveQuality,
        businessQuality: parsed.businessQuality,
        financialStrength: parsed.financialStrength,
        industryPosition: parsed.industryPosition,
        growthPotential: parsed.growthPotential,
        valuation: parsed.valuation,
        catalysts: parsed.catalysts,
        riskAssessment: parsed.riskAssessment,
        strengths: parsed.strengths || [],
        concerns: parsed.concerns || [],
        investmentThesis: parsed.investmentThesis,
        comparison: parsed.comparison
      };
    } catch (error) {
      console.error('Failed to parse analysis response:', error);
      throw new Error('Invalid analysis response format');
    }
  }

  /**
   * Batch analyze multiple companies
   */
  async batchAnalyze(tickers: string[]): Promise<Map<string, ComprehensiveAnalysis>> {
    console.log(`\n📊 Batch analyzing ${tickers.length} companies...\n`);
    
    const results = new Map<string, ComprehensiveAnalysis>();
    
    for (const ticker of tickers) {
      try {
        const analysis = await this.analyzeCompany(ticker);
        results.set(ticker, analysis);
        
        // Rate limiting - wait between analyses
        if (tickers.indexOf(ticker) < tickers.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error: any) {
        console.error(`Skipping ${ticker}: ${error.message}`);
      }
    }
    
    console.log(`\n✅ Batch analysis complete: ${results.size}/${tickers.length} successful\n`);
    return results;
  }
}

export default new ComprehensiveBusinessAnalysis();
