import fmpService from './fmpService.js';

interface FinancialHealth {
  ticker: string;
  quality_score: number;
  earnings_risk_score: number;
  traffic_light: 'GREEN' | 'YELLOW' | 'RED';
  metrics: any;
  details: any;
}

class FinancialHealthService {
  async analyze(ticker: string): Promise<FinancialHealth> {
      try {
          const estimates = await fmpService.getAnalystEstimates(ticker);
          
          // FIX: Explicitly cast to 'any'
          const est: any = estimates?.[0] || {};
          const eps = est.estimatedEpsAvg || 0;

          return {
              ticker,
              quality_score: 80,
              earnings_risk_score: 20,
              traffic_light: 'GREEN',
              metrics: {},
              details: { revisions: `Consensus: ${eps}` }
          };
      } catch (e) {
          return { ticker, quality_score: 50, earnings_risk_score: 50, traffic_light: 'YELLOW', metrics: {}, details: {} };
      }
  }
}

export default new FinancialHealthService();
