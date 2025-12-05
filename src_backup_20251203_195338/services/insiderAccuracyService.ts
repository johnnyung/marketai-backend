import governmentDataAdapter from './governmentDataAdapter.js';

interface InsiderSignal {
    score: number;
    alpha_score: number;
    top_insider: string | null;
    top_insider_accuracy: number;
    validity: 'HIGH_VALUE' | 'NOISE' | 'NEUTRAL';
    details: string[];
}

class InsiderAccuracyService {
  
  async analyze(ticker: string): Promise<InsiderSignal> {
      try {
          const trades = await governmentDataAdapter.getInsiderTrades(ticker);
          
          if (!trades || trades.length === 0) {
              return {
                  score: 50,
                  alpha_score: 0,
                  top_insider: null,
                  top_insider_accuracy: 0,
                  validity: 'NEUTRAL',
                  details: ['No recent insider trades found']
              };
          }

          // Real Calculation: Filter for Cluster Buys
          const buys = trades.filter(t => t.type.includes('Buy'));
          const score = buys.length > 3 ? 80 : 50;

          return {
              score,
              alpha_score: 0, // Placeholder for complex calc
              top_insider: buys.length > 0 ? buys[0].name : null,
              top_insider_accuracy: 0,
              validity: buys.length > 0 ? 'HIGH_VALUE' : 'NEUTRAL',
              details: [`${buys.length} insider buys detected`]
          };

      } catch (e) {
          return {
              score: 50,
              alpha_score: 0,
              top_insider: null,
              top_insider_accuracy: 0,
              validity: 'NEUTRAL',
              details: ['Analysis Failed']
          };
      }
  }
}

export default new InsiderAccuracyService();
