import fmpService from './fmpService.js';

interface LeakageSignal {
  etf: string;
  component: string;
  leakage_score: number;
  type: string;
  reason: string;
}

class EtfLeakageService {
  
  async detectLeakage(): Promise<LeakageSignal[]> {
      // MVL: Scan major ETF for component divergence
      try {
          const etf = 'XLK'; // Tech Sector
          const holdings = await fmpService.getEtfHoldings(etf);
          
          if (!holdings || holdings.length === 0) return [];

          // Sort by weight
          const topHolding = holdings.sort((a: any, b: any) => b.weightPercentage - a.weightPercentage)[0];
          
          if (topHolding && topHolding.weightPercentage > 22) {
              return [{
                  etf,
                  component: topHolding.asset,
                  leakage_score: 80,
                  type: 'CONCENTRATION_RISK',
                  reason: `${topHolding.asset} constitutes ${topHolding.weightPercentage}% of ${etf}`
              }];
          }
          
          return [];
      } catch (e) {
          return [];
      }
  }
}

export default new EtfLeakageService();
