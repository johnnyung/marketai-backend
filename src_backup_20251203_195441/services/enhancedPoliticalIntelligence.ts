import governmentDataAdapter, { GovTrade } from './governmentDataAdapter.js';

interface PoliticalData {
  source: string;
  type: string;
  timestamp: Date;
  title: string;
  content: string;
  ticker?: string;
  politician?: string;
  sentiment?: 'bullish' | 'bearish' | 'neutral';
  metadata: any;
}

class EnhancedPoliticalIntelligenceService {
  
  async fetchAll(): Promise<PoliticalData[]> {
      const senate = await governmentDataAdapter.getSenateTrades();
      const house = await governmentDataAdapter.getHouseTrades();
      
      const allTrades = [...senate, ...house];

      return allTrades.map(t => ({
          source: t.source,
          type: 'political_trade',
          timestamp: new Date(t.date),
          title: `${t.chamber} Trade: ${t.politician}`,
          content: `${t.type.toUpperCase()} ${t.ticker} ($${t.amount})`,
          ticker: t.ticker,
          politician: t.politician,
          sentiment: t.type === 'purchase' ? 'bullish' : 'bearish',
          metadata: t
      }));
  }

  async getForTicker(ticker: string): Promise<PoliticalData[]> {
      const all = await this.fetchAll();
      return all.filter(p => p.ticker === ticker);
  }

  // --- PURGED METHODS (No Mocks Allowed) ---
  
  async fetchCommitteeData() { return []; }
  async fetchLobbyingData() { return []; }
  async fetchCampaignContributions() { return []; }
  async fetchVotingRecords() { return []; }
  
  // Helper for Digest Service compatibility
  calculateRelevance(type: string, data: any): number {
      return 50; // Neutral default logic
  }
  
  extractTickers(text: string): string[] {
      const matches = text.match(/\b[A-Z]{2,5}\b/g);
      return matches ? [...new Set(matches)] : [];
  }
}

export default new EnhancedPoliticalIntelligenceService();
