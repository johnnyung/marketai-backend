import dataProviderGrid from './dataProviderGrid.js';
import { FundamentalData } from '../types/dataProviderTypes.js';

/**
 * Fundamental Analysis Service (Real Data)
 * Uses DataProviderGrid to fetch verified financial data.
 */
class FundamentalAnalysisService {
  
  public async performComprehensiveVetting(ticker: string): Promise<any> {
    // 1. Get Real Data
    const data = await dataProviderGrid.getFundamentals(ticker);
    
    if (!data) {
        return {
            ticker,
            overallScore: 0,
            overallStatus: 'REJECTED',
            scores: [],
            summary: 'Data unavailable for fundamental analysis.',
            generatedAt: new Date().toISOString()
        };
    }

    // 2. Compute FSI Scores (Real Logic)
    const valuationScore = this.scoreValuation(data);
    const profitabilityScore = this.scoreProfitability(data);
    const healthScore = this.scoreHealth(data);

    const totalScore = Math.round((valuationScore + profitabilityScore + healthScore) / 3);
    
    let status = 'CAUTION';
    if (totalScore >= 70) status = 'APPROVED';
    if (totalScore <= 40) status = 'REJECTED';

    return {
        ticker,
        overallScore: totalScore,
        overallStatus: status,
        scores: [
            { category: 'Valuation', score: valuationScore, reasoning: `PE: ${data.peRatio.toFixed(2)}` },
            { category: 'Profitability', score: profitabilityScore, reasoning: `Margin: ${data.profitMargin.toFixed(2)}%` },
            { category: 'Health', score: healthScore, reasoning: `Debt/Eq: ${data.debtToEquity.toFixed(2)}` }
        ],
        summary: `FSI Analysis: ${status} (${totalScore}/100). Powered by ${data.source}.`,
        generatedAt: new Date().toISOString()
    };
  }

  private scoreValuation(d: FundamentalData): number {
      let score = 50;
      if (d.peRatio > 0 && d.peRatio < 25) score += 20;
      if (d.peRatio > 50) score -= 20;
      if (d.pegRatio > 0 && d.pegRatio < 1.5) score += 20;
      return Math.max(0, Math.min(100, score));
  }

  private scoreProfitability(d: FundamentalData): number {
      let score = 50;
      if (d.profitMargin > 0.15) score += 20; // 15% margin is good
      if (d.profitMargin < 0) score -= 30;
      if (d.operatingMargin > 0.10) score += 10;
      return Math.max(0, Math.min(100, score));
  }

  private scoreHealth(d: FundamentalData): number {
      let score = 50;
      if (d.debtToEquity < 0.5) score += 20;
      if (d.debtToEquity > 2.0) score -= 20;
      return Math.max(0, Math.min(100, score));
  }
}

export default new FundamentalAnalysisService();
