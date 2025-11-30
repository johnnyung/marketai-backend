import fmpService from './fmpService.js';
import pool from '../db/index.js';

interface FinancialHealth {
  ticker: string;
  quality_score: number; // 0-100 (Fundamental Strength)
  earnings_risk_score: number; // 0-100 (High Score = High Risk)
  traffic_light: 'GREEN' | 'YELLOW' | 'RED';
  metrics: {
    profitability: string;
    leverage: string;
    cash_flow: string;
    revisions: string;
  };
  details: any;
}

class FinancialHealthService {

  async analyze(ticker: string): Promise<FinancialHealth> {
    try {
        // 1. Fetch Raw Data
        // We need TTM Ratios, Balance Sheet, and Analyst Estimates
        const [ratios, bs, income, estimates] = await Promise.all([
            fmpService.getFinancialRatios(ticker, 'annual', 1), // TTM usually in ratios endpoint
            fmpService.getBalanceSheet(ticker, 'quarter', 1),
            fmpService.getIncomeStatement(ticker, 'quarter', 2), // Compare last 2 quarters
            fmpService.getAnalystEstimates(ticker)
        ]);

        const r = ratios && ratios.length > 0 ? ratios[0] : {};
        const b = bs && bs.length > 0 ? bs[0] : {};
        const incCurrent = income && income.length > 0 ? income[0] : {};
        const incPrev = income && income.length > 1 ? income[1] : {};
        const est = estimates || {};

        // 2. Calculate Quality Score (Fundamentals)
        let qScore = 0;
        
        // Profitability (40 pts)
        if ((r.netProfitMarginTTM || 0) > 0.20) qScore += 20;
        else if ((r.netProfitMarginTTM || 0) > 0.10) qScore += 10;
        else if ((r.netProfitMarginTTM || 0) > 0) qScore += 5;

        if ((r.returnOnEquityTTM || 0) > 0.15) qScore += 20;
        else if ((r.returnOnEquityTTM || 0) > 0.08) qScore += 10;

        // Leverage / Safety (30 pts)
        if ((r.debtEquityRatioTTM || 0) < 0.5) qScore += 15;
        else if ((r.debtEquityRatioTTM || 0) < 1.0) qScore += 10;

        if ((r.currentRatioTTM || 0) > 1.5) qScore += 15;
        else if ((r.currentRatioTTM || 0) > 1.0) qScore += 5;

        // Growth (30 pts) - Quarter over Quarter Revenue
        const revGrowth = incPrev.revenue ? ((incCurrent.revenue - incPrev.revenue) / incPrev.revenue) : 0;
        if (revGrowth > 0.15) qScore += 30; // >15% QoQ
        else if (revGrowth > 0.05) qScore += 15;
        else if (revGrowth > 0) qScore += 5;

        qScore = Math.min(100, qScore);

        // 3. Calculate Earnings Risk Score (Sentiment/Revisions)
        let riskScore = 50; // Start neutral
        
        // Analyst Estimates (Proxy for revisions)
        // If current EPS < Estimated EPS, risk is higher
        if (est.estimatedEpsAvg && incCurrent.eps) {
            if (incCurrent.eps < est.estimatedEpsAvg) riskScore += 20; // Missed last
            else riskScore -= 20; // Beat last
        }
        
        // Cash Flow Quality (Accruals check)
        // If Net Income > Operating Cash Flow significantly, earnings quality is low (high risk)
        if (incCurrent.netIncome && incCurrent.netIncome > (b.cashAndCashEquivalents || 0) * 2) {
            // Crude proxy without full CF statement, assuming cash correlation
            // Better check: Net Income vs OCF. FMP 'ratios' has operatingCashFlowPerShareTTM
        }

        // Clamp
        riskScore = Math.min(100, Math.max(0, riskScore));

        // 4. Determine Traffic Light
        let light: 'GREEN' | 'YELLOW' | 'RED' = 'YELLOW';
        if (qScore > 70 && riskScore < 60) light = 'GREEN';
        if (qScore < 40 || riskScore > 80) light = 'RED';

        const result: FinancialHealth = {
            ticker,
            quality_score: qScore,
            earnings_risk_score: riskScore,
            traffic_light: light,
            metrics: {
                profitability: `Net Margin: ${((r.netProfitMarginTTM||0)*100).toFixed(1)}%`,
                leverage: `Debt/Eq: ${(r.debtEquityRatioTTM||0).toFixed(2)}`,
                cash_flow: `Rev Growth: ${(revGrowth*100).toFixed(1)}%`,
                revisions: `Analyst Consensus: ${est.estimatedEpsAvg || 'N/A'}`
            },
            details: { ratios: r, estimates: est }
        };

        // 5. Save to DB
        await this.saveSnapshot(result);

        return result;

    } catch (e: any) {
        console.error(`FSI Error for ${ticker}:`, e.message);
        return {
            ticker, quality_score: 50, earnings_risk_score: 50, traffic_light: 'YELLOW',
            metrics: { profitability: '-', leverage: '-', cash_flow: '-', revisions: '-' }, details: {}
        };
    }
  }

  private async saveSnapshot(data: FinancialHealth) {
      try {
          await pool.query(`
            INSERT INTO financial_health_snapshots (ticker, quality_score, earnings_risk_score, traffic_light, analysis_data, created_at)
            VALUES ($1, $2, $3, $4, $5, NOW())
          `, [data.ticker, data.quality_score, data.earnings_risk_score, data.traffic_light, JSON.stringify(data.metrics)]);
      } catch(e) {}
  }
}

export default new FinancialHealthService();
