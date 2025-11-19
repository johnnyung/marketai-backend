// backend/src/services/fundamentalAnalysisService.ts
// Enhanced 20-Point Vetting Using REAL Financial Data from FMP
// Replaces mock vetting with actual fundamental analysis

import { Pool } from 'pg';
import fmpService from './fmpService.js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

interface VettingCategory {
  category: string;
  score: number; // 0-100
  status: 'PASS' | 'WARNING' | 'FAIL';
  reasoning: string;
  keyFindings: string[];
}

interface VettingResult {
  ticker: string;
  overallScore: number; // 0-100
  overallStatus: 'APPROVED' | 'CAUTION' | 'REJECTED';
  scores: VettingCategory[];
  summary: string;
  keyStrengths: string[];
  keyRisks: string[];
  generatedAt: string;
}

class FundamentalAnalysisService {
  
  /**
   * MAIN METHOD: Comprehensive 20-Point Vetting
   */
  async performComprehensiveVetting(ticker: string): Promise<VettingResult> {
    console.log(`\n🔍 Starting comprehensive 20-point vetting for ${ticker}...`);
    
    try {
      // Check cache first (24-hour validity)
      const cached = await this.getCachedVetting(ticker);
      if (cached) {
        console.log(`  ✓ Using cached vetting for ${ticker}`);
        return cached;
      }

      console.log(`  → No cache found, generating new vetting...`);
      
      // Fetch complete fundamentals from FMP
      const fundamentals = await fmpService.getCompleteFundamentals(ticker);
      
      if (!fundamentals.profile) {
        throw new Error(`No fundamental data available for ${ticker}`);
      }

      // Calculate key metrics
      const metrics = fmpService.calculateKeyMetrics(fundamentals);
      
      if (!metrics) {
        throw new Error(`Unable to calculate metrics for ${ticker}`);
      }

      // Store in database
      await this.storeFundamentals(ticker, fundamentals, metrics);

      // Perform 20-point vetting
      const scores = this.calculateAllScores(ticker, fundamentals, metrics);
      
      // Calculate overall score and status
      const overallScore = Math.round(
        scores.reduce((sum, s) => sum + s.score, 0) / scores.length
      );

      const overallStatus = this.determineOverallStatus(overallScore, scores);

      // Generate summary
      const summary = this.generateSummary(ticker, fundamentals.profile, metrics, overallScore);
      const keyStrengths = this.extractStrengths(scores);
      const keyRisks = this.extractRisks(scores);

      const result: VettingResult = {
        ticker,
        overallScore,
        overallStatus,
        scores,
        summary,
        keyStrengths,
        keyRisks,
        generatedAt: new Date().toISOString()
      };

      // Cache the result
      await this.cacheVetting(ticker, result);

      console.log(`✅ Vetting complete for ${ticker}: ${overallScore}/100 (${overallStatus})\n`);
      
      return result;

    } catch (error: any) {
      console.error(`❌ Vetting failed for ${ticker}:`, error.message);
      throw error;
    }
  }

  /**
   * Calculate all 20 vetting scores
   */
  private calculateAllScores(ticker: string, fundamentals: any, metrics: any): VettingCategory[] {
    const scores: VettingCategory[] = [];

    // === PROFITABILITY (5 points) ===
    scores.push(this.scoreNetMargin(metrics.profitability.netMargin));
    scores.push(this.scoreGrossMargin(metrics.profitability.grossMargin));
    scores.push(this.scoreROE(metrics.profitability.roe));
    scores.push(this.scoreROA(metrics.profitability.roa));
    scores.push(this.scoreOperatingMargin(metrics.profitability.operatingMargin));

    // === LIQUIDITY (3 points) ===
    scores.push(this.scoreCurrentRatio(metrics.liquidity.currentRatio));
    scores.push(this.scoreQuickRatio(metrics.liquidity.quickRatio));
    scores.push(this.scoreCashRatio(metrics.liquidity.cashRatio));

    // === LEVERAGE (3 points) ===
    scores.push(this.scoreDebtToEquity(metrics.leverage.debtToEquity));
    scores.push(this.scoreDebtRatio(metrics.leverage.debtRatio));
    scores.push(this.scoreInterestCoverage(metrics.leverage.interestCoverage));

    // === GROWTH (3 points) ===
    scores.push(this.scoreRevenueGrowth(metrics.growth.revenueGrowth));
    scores.push(this.scoreEarningsGrowth(metrics.growth.earningsGrowth));
    scores.push(this.scoreFCFGrowth(metrics.growth.fcfGrowth));

    // === EFFICIENCY (3 points) ===
    scores.push(this.scoreAssetTurnover(metrics.efficiency.assetTurnover));
    scores.push(this.scoreInventoryTurnover(metrics.efficiency.inventoryTurnover));
    scores.push(this.scoreReceivablesTurnover(metrics.efficiency.receivablesTurnover));

    // === VALUATION (3 points) ===
    scores.push(this.scorePE(metrics.valuation.pe));
    scores.push(this.scorePB(metrics.valuation.pb));
    scores.push(this.scorePriceToFCF(metrics.valuation.priceToFCF));

    return scores;
  }

  // ==================== PROFITABILITY SCORING ====================

  private scoreNetMargin(netMargin: number): VettingCategory {
    let score = 0;
    let status: 'PASS' | 'WARNING' | 'FAIL' = 'FAIL';
    let reasoning = '';

    if (netMargin >= 0.20) { // 20%+
      score = 100;
      status = 'PASS';
      reasoning = `Excellent net margin of ${(netMargin * 100).toFixed(1)}% indicates strong profitability`;
    } else if (netMargin >= 0.10) { // 10-20%
      score = 75;
      status = 'PASS';
      reasoning = `Good net margin of ${(netMargin * 100).toFixed(1)}% shows solid profitability`;
    } else if (netMargin >= 0.05) { // 5-10%
      score = 50;
      status = 'WARNING';
      reasoning = `Moderate net margin of ${(netMargin * 100).toFixed(1)}% - acceptable but not exceptional`;
    } else if (netMargin >= 0) { // 0-5%
      score = 25;
      status = 'WARNING';
      reasoning = `Low net margin of ${(netMargin * 100).toFixed(1)}% - limited profitability`;
    } else { // Negative
      score = 0;
      status = 'FAIL';
      reasoning = `Negative net margin of ${(netMargin * 100).toFixed(1)}% - company is unprofitable`;
    }

    return {
      category: 'Net Profit Margin',
      score,
      status,
      reasoning,
      keyFindings: [`${(netMargin * 100).toFixed(1)}% net margin`]
    };
  }

  private scoreGrossMargin(grossMargin: number): VettingCategory {
    let score = 0;
    let status: 'PASS' | 'WARNING' | 'FAIL' = 'FAIL';

    if (grossMargin >= 0.50) {
      score = 100;
      status = 'PASS';
    } else if (grossMargin >= 0.35) {
      score = 75;
      status = 'PASS';
    } else if (grossMargin >= 0.20) {
      score = 50;
      status = 'WARNING';
    } else {
      score = 25;
      status = 'FAIL';
    }

    return {
      category: 'Gross Profit Margin',
      score,
      status,
      reasoning: `Gross margin: ${(grossMargin * 100).toFixed(1)}%`,
      keyFindings: [`${(grossMargin * 100).toFixed(1)}% gross margin`]
    };
  }

  private scoreROE(roe: number): VettingCategory {
    let score = 0;
    let status: 'PASS' | 'WARNING' | 'FAIL' = 'FAIL';

    if (roe >= 0.20) { // 20%+
      score = 100;
      status = 'PASS';
    } else if (roe >= 0.15) { // 15-20%
      score = 75;
      status = 'PASS';
    } else if (roe >= 0.10) { // 10-15%
      score = 50;
      status = 'WARNING';
    } else if (roe >= 0) {
      score = 25;
      status = 'WARNING';
    } else {
      score = 0;
      status = 'FAIL';
    }

    return {
      category: 'Return on Equity (ROE)',
      score,
      status,
      reasoning: `ROE: ${(roe * 100).toFixed(1)}%`,
      keyFindings: [`${(roe * 100).toFixed(1)}% ROE`]
    };
  }

  private scoreROA(roa: number): VettingCategory {
    let score = 0;
    let status: 'PASS' | 'WARNING' | 'FAIL' = 'FAIL';

    if (roa >= 0.10) {
      score = 100;
      status = 'PASS';
    } else if (roa >= 0.05) {
      score = 75;
      status = 'PASS';
    } else if (roa >= 0.02) {
      score = 50;
      status = 'WARNING';
    } else {
      score = 25;
      status = 'FAIL';
    }

    return {
      category: 'Return on Assets (ROA)',
      score,
      status,
      reasoning: `ROA: ${(roa * 100).toFixed(1)}%`,
      keyFindings: [`${(roa * 100).toFixed(1)}% ROA`]
    };
  }

  private scoreOperatingMargin(operatingMargin: number): VettingCategory {
    let score = 0;
    let status: 'PASS' | 'WARNING' | 'FAIL' = 'FAIL';

    if (operatingMargin >= 0.20) {
      score = 100;
      status = 'PASS';
    } else if (operatingMargin >= 0.10) {
      score = 75;
      status = 'PASS';
    } else if (operatingMargin >= 0.05) {
      score = 50;
      status = 'WARNING';
    } else {
      score = 25;
      status = 'FAIL';
    }

    return {
      category: 'Operating Margin',
      score,
      status,
      reasoning: `Operating margin: ${(operatingMargin * 100).toFixed(1)}%`,
      keyFindings: [`${(operatingMargin * 100).toFixed(1)}% operating margin`]
    };
  }

  // ==================== LIQUIDITY SCORING ====================

  private scoreCurrentRatio(currentRatio: number): VettingCategory {
    let score = 0;
    let status: 'PASS' | 'WARNING' | 'FAIL' = 'FAIL';

    if (currentRatio >= 2.0) {
      score = 100;
      status = 'PASS';
    } else if (currentRatio >= 1.5) {
      score = 75;
      status = 'PASS';
    } else if (currentRatio >= 1.0) {
      score = 50;
      status = 'WARNING';
    } else {
      score = 25;
      status = 'FAIL';
    }

    return {
      category: 'Current Ratio',
      score,
      status,
      reasoning: `Current ratio: ${currentRatio.toFixed(2)}x`,
      keyFindings: [`${currentRatio.toFixed(2)}x current ratio`]
    };
  }

  private scoreQuickRatio(quickRatio: number): VettingCategory {
    let score = 0;
    let status: 'PASS' | 'WARNING' | 'FAIL' = 'FAIL';

    if (quickRatio >= 1.5) {
      score = 100;
      status = 'PASS';
    } else if (quickRatio >= 1.0) {
      score = 75;
      status = 'PASS';
    } else if (quickRatio >= 0.75) {
      score = 50;
      status = 'WARNING';
    } else {
      score = 25;
      status = 'FAIL';
    }

    return {
      category: 'Quick Ratio',
      score,
      status,
      reasoning: `Quick ratio: ${quickRatio.toFixed(2)}x`,
      keyFindings: [`${quickRatio.toFixed(2)}x quick ratio`]
    };
  }

  private scoreCashRatio(cashRatio: number): VettingCategory {
    let score = 0;
    let status: 'PASS' | 'WARNING' | 'FAIL' = 'FAIL';

    if (cashRatio >= 0.5) {
      score = 100;
      status = 'PASS';
    } else if (cashRatio >= 0.25) {
      score = 75;
      status = 'PASS';
    } else if (cashRatio >= 0.10) {
      score = 50;
      status = 'WARNING';
    } else {
      score = 25;
      status = 'FAIL';
    }

    return {
      category: 'Cash Ratio',
      score,
      status,
      reasoning: `Cash ratio: ${cashRatio.toFixed(2)}x`,
      keyFindings: [`${cashRatio.toFixed(2)}x cash ratio`]
    };
  }

  // ==================== LEVERAGE SCORING ====================

  private scoreDebtToEquity(debtToEquity: number): VettingCategory {
    let score = 0;
    let status: 'PASS' | 'WARNING' | 'FAIL' = 'FAIL';

    if (debtToEquity <= 0.5) {
      score = 100;
      status = 'PASS';
    } else if (debtToEquity <= 1.0) {
      score = 75;
      status = 'PASS';
    } else if (debtToEquity <= 2.0) {
      score = 50;
      status = 'WARNING';
    } else {
      score = 25;
      status = 'FAIL';
    }

    return {
      category: 'Debt-to-Equity',
      score,
      status,
      reasoning: `D/E ratio: ${debtToEquity.toFixed(2)}x`,
      keyFindings: [`${debtToEquity.toFixed(2)}x debt-to-equity`]
    };
  }

  private scoreDebtRatio(debtRatio: number): VettingCategory {
    let score = 0;
    let status: 'PASS' | 'WARNING' | 'FAIL' = 'FAIL';

    if (debtRatio <= 0.3) {
      score = 100;
      status = 'PASS';
    } else if (debtRatio <= 0.5) {
      score = 75;
      status = 'PASS';
    } else if (debtRatio <= 0.7) {
      score = 50;
      status = 'WARNING';
    } else {
      score = 25;
      status = 'FAIL';
    }

    return {
      category: 'Debt Ratio',
      score,
      status,
      reasoning: `Debt ratio: ${(debtRatio * 100).toFixed(1)}%`,
      keyFindings: [`${(debtRatio * 100).toFixed(1)}% debt ratio`]
    };
  }

  private scoreInterestCoverage(interestCoverage: number): VettingCategory {
    let score = 0;
    let status: 'PASS' | 'WARNING' | 'FAIL' = 'FAIL';

    if (interestCoverage >= 10) {
      score = 100;
      status = 'PASS';
    } else if (interestCoverage >= 5) {
      score = 75;
      status = 'PASS';
    } else if (interestCoverage >= 2) {
      score = 50;
      status = 'WARNING';
    } else {
      score = 25;
      status = 'FAIL';
    }

    return {
      category: 'Interest Coverage',
      score,
      status,
      reasoning: `Interest coverage: ${interestCoverage.toFixed(1)}x`,
      keyFindings: [`${interestCoverage.toFixed(1)}x interest coverage`]
    };
  }

  // ==================== GROWTH SCORING ====================

  private scoreRevenueGrowth(revenueGrowth: number): VettingCategory {
    let score = 0;
    let status: 'PASS' | 'WARNING' | 'FAIL' = 'FAIL';

    if (revenueGrowth >= 20) {
      score = 100;
      status = 'PASS';
    } else if (revenueGrowth >= 10) {
      score = 75;
      status = 'PASS';
    } else if (revenueGrowth >= 5) {
      score = 50;
      status = 'WARNING';
    } else if (revenueGrowth >= 0) {
      score = 25;
      status = 'WARNING';
    } else {
      score = 0;
      status = 'FAIL';
    }

    return {
      category: 'Revenue Growth',
      score,
      status,
      reasoning: `YoY revenue growth: ${revenueGrowth.toFixed(1)}%`,
      keyFindings: [`${revenueGrowth.toFixed(1)}% revenue growth`]
    };
  }

  private scoreEarningsGrowth(earningsGrowth: number): VettingCategory {
    let score = 0;
    let status: 'PASS' | 'WARNING' | 'FAIL' = 'FAIL';

    if (earningsGrowth >= 25) {
      score = 100;
      status = 'PASS';
    } else if (earningsGrowth >= 15) {
      score = 75;
      status = 'PASS';
    } else if (earningsGrowth >= 5) {
      score = 50;
      status = 'WARNING';
    } else {
      score = 25;
      status = 'FAIL';
    }

    return {
      category: 'Earnings Growth',
      score,
      status,
      reasoning: `YoY earnings growth: ${earningsGrowth.toFixed(1)}%`,
      keyFindings: [`${earningsGrowth.toFixed(1)}% earnings growth`]
    };
  }

  private scoreFCFGrowth(fcfGrowth: number): VettingCategory {
    let score = 0;
    let status: 'PASS' | 'WARNING' | 'FAIL' = 'FAIL';

    if (fcfGrowth >= 20) {
      score = 100;
      status = 'PASS';
    } else if (fcfGrowth >= 10) {
      score = 75;
      status = 'PASS';
    } else if (fcfGrowth >= 0) {
      score = 50;
      status = 'WARNING';
    } else {
      score = 25;
      status = 'FAIL';
    }

    return {
      category: 'Free Cash Flow Growth',
      score,
      status,
      reasoning: `YoY FCF growth: ${fcfGrowth.toFixed(1)}%`,
      keyFindings: [`${fcfGrowth.toFixed(1)}% FCF growth`]
    };
  }

  // ==================== EFFICIENCY SCORING ====================

  private scoreAssetTurnover(assetTurnover: number): VettingCategory {
    let score = 0;
    let status: 'PASS' | 'WARNING' | 'FAIL' = 'FAIL';

    if (assetTurnover >= 1.5) {
      score = 100;
      status = 'PASS';
    } else if (assetTurnover >= 1.0) {
      score = 75;
      status = 'PASS';
    } else if (assetTurnover >= 0.5) {
      score = 50;
      status = 'WARNING';
    } else {
      score = 25;
      status = 'FAIL';
    }

    return {
      category: 'Asset Turnover',
      score,
      status,
      reasoning: `Asset turnover: ${assetTurnover.toFixed(2)}x`,
      keyFindings: [`${assetTurnover.toFixed(2)}x asset turnover`]
    };
  }

  private scoreInventoryTurnover(inventoryTurnover: number): VettingCategory {
    let score = 0;
    let status: 'PASS' | 'WARNING' | 'FAIL' = 'FAIL';

    if (inventoryTurnover >= 10) {
      score = 100;
      status = 'PASS';
    } else if (inventoryTurnover >= 5) {
      score = 75;
      status = 'PASS';
    } else if (inventoryTurnover >= 2) {
      score = 50;
      status = 'WARNING';
    } else {
      score = 25;
      status = 'FAIL';
    }

    return {
      category: 'Inventory Turnover',
      score,
      status,
      reasoning: `Inventory turnover: ${inventoryTurnover.toFixed(1)}x`,
      keyFindings: [`${inventoryTurnover.toFixed(1)}x inventory turnover`]
    };
  }

  private scoreReceivablesTurnover(receivablesTurnover: number): VettingCategory {
    let score = 0;
    let status: 'PASS' | 'WARNING' | 'FAIL' = 'FAIL';

    if (receivablesTurnover >= 12) {
      score = 100;
      status = 'PASS';
    } else if (receivablesTurnover >= 8) {
      score = 75;
      status = 'PASS';
    } else if (receivablesTurnover >= 4) {
      score = 50;
      status = 'WARNING';
    } else {
      score = 25;
      status = 'FAIL';
    }

    return {
      category: 'Receivables Turnover',
      score,
      status,
      reasoning: `Receivables turnover: ${receivablesTurnover.toFixed(1)}x`,
      keyFindings: [`${receivablesTurnover.toFixed(1)}x receivables turnover`]
    };
  }

  // ==================== VALUATION SCORING ====================

  private scorePE(pe: number): VettingCategory {
    let score = 0;
    let status: 'PASS' | 'WARNING' | 'FAIL' = 'FAIL';

    if (pe > 0 && pe <= 15) {
      score = 100;
      status = 'PASS';
    } else if (pe <= 25) {
      score = 75;
      status = 'PASS';
    } else if (pe <= 35) {
      score = 50;
      status = 'WARNING';
    } else {
      score = 25;
      status = 'FAIL';
    }

    return {
      category: 'P/E Ratio',
      score,
      status,
      reasoning: `P/E: ${pe.toFixed(1)}x`,
      keyFindings: [`${pe.toFixed(1)}x P/E ratio`]
    };
  }

  private scorePB(pb: number): VettingCategory {
    let score = 0;
    let status: 'PASS' | 'WARNING' | 'FAIL' = 'FAIL';

    if (pb > 0 && pb <= 1.5) {
      score = 100;
      status = 'PASS';
    } else if (pb <= 3.0) {
      score = 75;
      status = 'PASS';
    } else if (pb <= 5.0) {
      score = 50;
      status = 'WARNING';
    } else {
      score = 25;
      status = 'FAIL';
    }

    return {
      category: 'P/B Ratio',
      score,
      status,
      reasoning: `P/B: ${pb.toFixed(1)}x`,
      keyFindings: [`${pb.toFixed(1)}x P/B ratio`]
    };
  }

  private scorePriceToFCF(priceToFCF: number): VettingCategory {
    let score = 0;
    let status: 'PASS' | 'WARNING' | 'FAIL' = 'FAIL';

    if (priceToFCF > 0 && priceToFCF <= 15) {
      score = 100;
      status = 'PASS';
    } else if (priceToFCF <= 25) {
      score = 75;
      status = 'PASS';
    } else if (priceToFCF <= 40) {
      score = 50;
      status = 'WARNING';
    } else {
      score = 25;
      status = 'FAIL';
    }

    return {
      category: 'Price-to-FCF',
      score,
      status,
      reasoning: `Price/FCF: ${priceToFCF.toFixed(1)}x`,
      keyFindings: [`${priceToFCF.toFixed(1)}x price-to-FCF`]
    };
  }

  // ==================== HELPER METHODS ====================

  private determineOverallStatus(overallScore: number, scores: VettingCategory[]): 'APPROVED' | 'CAUTION' | 'REJECTED' {
    const failCount = scores.filter(s => s.status === 'FAIL').length;
    
    if (overallScore >= 70 && failCount <= 2) {
      return 'APPROVED';
    } else if (overallScore >= 50 || failCount <= 5) {
      return 'CAUTION';
    } else {
      return 'REJECTED';
    }
  }

  private generateSummary(ticker: string, profile: any, metrics: any, overallScore: number): string {
    return `${profile.companyName} (${ticker}) scores ${overallScore}/100 on comprehensive fundamental analysis. ` +
      `The company operates in ${profile.industry} with $${(profile.mktCap / 1e9).toFixed(1)}B market cap. ` +
      `Key metrics: ${(metrics.profitability.netMargin * 100).toFixed(1)}% net margin, ` +
      `${(metrics.profitability.roe * 100).toFixed(1)}% ROE, ` +
      `${metrics.growth.revenueGrowth.toFixed(1)}% revenue growth.`;
  }

  private extractStrengths(scores: VettingCategory[]): string[] {
    return scores
      .filter(s => s.status === 'PASS' && s.score >= 75)
      .slice(0, 5)
      .map(s => s.category);
  }

  private extractRisks(scores: VettingCategory[]): string[] {
    return scores
      .filter(s => s.status === 'FAIL' || (s.status === 'WARNING' && s.score < 40))
      .slice(0, 5)
      .map(s => s.category);
  }

  // ==================== DATABASE METHODS ====================

  private async storeFundamentals(ticker: string, fundamentals: any, metrics: any): Promise<void> {
    try {
      await pool.query(`
        INSERT INTO company_fundamentals (
          ticker, company_name, sector, industry, market_cap,
          net_margin, gross_margin, operating_margin, roe, roa,
          current_ratio, quick_ratio, cash_ratio,
          debt_to_equity, debt_ratio, interest_coverage,
          asset_turnover, inventory_turnover, receivables_turnover,
          revenue_growth, earnings_growth, fcf_growth,
          pe_ratio, pb_ratio, ps_ratio, price_to_fcf,
          last_updated
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19,
          $20, $21, $22, $23, $24, $25, $26, NOW()
        )
        ON CONFLICT (ticker) DO UPDATE SET
          company_name = EXCLUDED.company_name,
          sector = EXCLUDED.sector,
          market_cap = EXCLUDED.market_cap,
          net_margin = EXCLUDED.net_margin,
          gross_margin = EXCLUDED.gross_margin,
          roe = EXCLUDED.roe,
          current_ratio = EXCLUDED.current_ratio,
          debt_to_equity = EXCLUDED.debt_to_equity,
          revenue_growth = EXCLUDED.revenue_growth,
          pe_ratio = EXCLUDED.pe_ratio,
          last_updated = NOW()
      `, [
        ticker,
        fundamentals.profile?.companyName || ticker,
        fundamentals.profile?.sector || '',
        fundamentals.profile?.industry || '',
        fundamentals.profile?.mktCap || 0,
        metrics.profitability.netMargin,
        metrics.profitability.grossMargin,
        metrics.profitability.operatingMargin,
        metrics.profitability.roe,
        metrics.profitability.roa,
        metrics.liquidity.currentRatio,
        metrics.liquidity.quickRatio,
        metrics.liquidity.cashRatio,
        metrics.leverage.debtToEquity,
        metrics.leverage.debtRatio,
        metrics.leverage.interestCoverage,
        metrics.efficiency.assetTurnover,
        metrics.efficiency.inventoryTurnover,
        metrics.efficiency.receivablesTurnover,
        metrics.growth.revenueGrowth,
        metrics.growth.earningsGrowth,
        metrics.growth.fcfGrowth,
        metrics.valuation.pe,
        metrics.valuation.pb,
        metrics.valuation.ps,
        metrics.valuation.priceToFCF
      ]);
    } catch (error) {
      console.error('Error storing fundamentals:', error);
    }
  }

  private async cacheVetting(ticker: string, result: VettingResult): Promise<void> {
    try {
      await pool.query(`
        INSERT INTO fundamental_vetting_cache (
          ticker, overall_score, overall_status, vetting_data,
          summary, key_strengths, key_risks, generated_at, valid_until
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (ticker) DO UPDATE SET
          overall_score = EXCLUDED.overall_score,
          overall_status = EXCLUDED.overall_status,
          vetting_data = EXCLUDED.vetting_data,
          summary = EXCLUDED.summary,
          generated_at = EXCLUDED.generated_at,
          valid_until = EXCLUDED.valid_until
      `, [
        ticker,
        result.overallScore,
        result.overallStatus,
        JSON.stringify(result.scores),
        result.summary,
        result.keyStrengths,
        result.keyRisks,
        new Date(),
        new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      ]);
    } catch (error) {
      console.error('Error caching vetting:', error);
    }
  }

  private async getCachedVetting(ticker: string): Promise<VettingResult | null> {
    try {
      const result = await pool.query(`
        SELECT * FROM fundamental_vetting_cache
        WHERE ticker = $1 AND valid_until > NOW()
      `, [ticker.toUpperCase()]);

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return {
        ticker: row.ticker,
        overallScore: row.overall_score,
        overallStatus: row.overall_status,
        scores: row.vetting_data,
        summary: row.summary,
        keyStrengths: row.key_strengths,
        keyRisks: row.key_risks,
        generatedAt: row.generated_at.toISOString()
      };
    } catch (error) {
      return null;
    }
  }
}

export default new FundamentalAnalysisService();
