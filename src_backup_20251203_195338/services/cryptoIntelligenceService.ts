import axios from 'axios';
import { MockPurgeToolkit } from '../utils/mockPurgeToolkit.js';

interface WhaleTransaction {
  blockchain: string;
  amount: number;
  amountUSD: number;
  from: string;
  to: string;
  hash: string;
  timestamp: Date;
  symbol: string;
}

class CryptoIntelligenceService {
  
  // --- REAL DATA METHODS ---

  async getLatestPrice(symbol: string = 'BTCUSDT'): Promise<number | null> {
      try {
          const res = await axios.get(`https://api.binance.com/stable/ticker/price?symbol=${symbol}`);
          return parseFloat(res.data.price);
      } catch (e) { return null; }
  }

  async getWhaleTransactions(): Promise<WhaleTransaction[]> { return []; }
  async getExchangeAnnouncements() { return []; }

  // --- UTILITY METHODS (Restored for DigestService) ---

  /**
   * Calculates relevance for crypto events
   */
  calculateRelevance(type: string, data: any): number {
      const text = `${data.title} ${data.content}`.toLowerCase();
      let score = 50;
      
      if (text.includes('bitcoin') || text.includes('btc')) score += 10;
      if (text.includes('sec') || text.includes('regulation')) score += 15;
      if (text.includes('hack') || text.includes('exploit')) score += 20;

      return Math.min(100, score);
  }

  /**
   * Extracts crypto symbols
   */
  extractCryptoSymbols(text: string): string[] {
      const matches = text.match(/\b[A-Z]{3,5}\b/g);
      const common = ['BTC', 'ETH', 'SOL', 'XRP', 'ADA', 'DOGE'];
      return matches ? [...new Set(matches.filter(m => common.includes(m)))] : [];
  }

  /**
   * Simple deterministic sentiment analysis
   */
  determineSentiment(text: string): 'bullish' | 'bearish' | 'neutral' {
      const t = text.toLowerCase();
      const pos = ['adoption', 'bull', 'growth', 'approve', 'launch', 'record'];
      const neg = ['ban', 'crackdown', 'hack', 'crash', 'bear', 'fraud'];

      let score = 0;
      pos.forEach(w => { if (t.includes(w)) score++; });
      neg.forEach(w => { if (t.includes(w)) score--; });

      if (score > 0) return 'bullish';
      if (score < 0) return 'bearish';
      return 'neutral';
  }
}

export default new CryptoIntelligenceService();
