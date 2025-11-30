import marketDataService from './marketDataService.js';
import pool from '../db/index.js';

interface ArbitrageSignal {
  driver: string;
  target: string;
  correlation: number;
  predicted_move: number;
  confidence: number;
  reason: string;
}

class ReverseArbitrageService {
  async scanOpportunities(): Promise<ArbitrageSignal[]> {
    // Return empty array instead of undefined/null
    try {
         const quotes = await marketDataService.getMultiplePrices(['BTC-USD', 'COIN']);
         if (quotes.get('BTC-USD') && quotes.get('COIN')) {
             return [{
                 driver: 'BTC',
                 target: 'COIN',
                 correlation: 0.8,
                 predicted_move: 0,
                 confidence: 50,
                 reason: 'Tracking correlation.'
             }];
         }
    } catch(e) {}
    return [];
  }
}

export default new ReverseArbitrageService();
