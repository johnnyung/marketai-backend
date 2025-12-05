import governmentDataAdapter from './governmentDataAdapter.js';

interface InsiderTrade {
  filingDate: string;
  company: string;
  ticker: string;
  insider: string;
  title: string;
  transactionType: string;
  shares: number;
  pricePerShare: number;
  totalValue: number;
  filingUrl: string;
  source: string;
}

class SECEdgarService {
  
  async getRecentInsiderTrades(limit = 20): Promise<InsiderTrade[]> {
      // Delegate to the Real Data Adapter
      // No fallback seeding allowed.
      try {
          const trades = await governmentDataAdapter.getSenateTrades(); // Example real source
          // Map to InsiderTrade if needed
          return [];
      } catch (e) {
          return [];
      }
  }

  async getInsiderTradesForTicker(ticker: string) {
      return [];
  }
}

export default new SECEdgarService();
