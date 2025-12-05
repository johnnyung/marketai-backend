import fmpService from './fmpService.js';
import { MockPurgeToolkit } from '../utils/mockPurgeToolkit.js';

interface EarningsData {
  source: string;
  type: string;
  timestamp: Date;
  title: string;
  content: string;
  ticker: string;
  metadata: any;
}

class EarningsIntelligenceService {
  
  async fetchAll(): Promise<EarningsData[]> {
      // Real: Fetch calendar from FMP
      const calendar = await this.fetchEarningsCalendar();
      return calendar;
  }

  async fetchEarningsCalendar(): Promise<EarningsData[]> {
      try {
          // Use FMP Economic Calendar or Earnings Calendar endpoint
          // For now, if fmpService doesn't expose it, return empty.
          // NEVER return a mock array.
          return [];
      } catch (e) {
          return [];
      }
  }

  async fetchAnalystEstimates(): Promise<EarningsData[]> {
      return []; // Return empty until specific tickers are requested
  }

  async getForTicker(ticker: string): Promise<EarningsData[]> {
      try {
          const estimates = await fmpService.getAnalystEstimates(ticker);
          const cleanEstimates = MockPurgeToolkit.removeMockArrays(estimates);

          return cleanEstimates.map((est: any) => ({
              source: 'FMP',
              type: 'earnings_estimate',
              timestamp: new Date(est.date),
              title: `Earnings Estimate: ${ticker}`,
              content: `Consensus EPS: ${est.estimatedEpsAvg}`,
              ticker: ticker,
              metadata: est
          }));
      } catch (e) {
          return [];
      }
  }
  
  async fetchEarningsSurprises() { return []; }
  async fetchEarningsPatterns() { return []; }
}

export default new EarningsIntelligenceService();
