import fmpService from './fmpService.js';

interface EtfSignal {
  etf: string;
  ticker: string;
  action: 'BUY' | 'SELL';
  weight_pct: number;
  reason: string;
  urgency: 'HIGH' | 'MEDIUM';
}

class EtfShadowService {
  
  // Real ETF mappings
  private ETF_MAP: Record<string, string> = { 'XLK': 'Technology', 'XLE': 'Energy' };

  async scanRebalancingRisks(): Promise<EtfSignal[]> {
      const signals: EtfSignal[] = [];
      const etfs = Object.keys(this.ETF_MAP);

      for (const etf of etfs) {
          try {
              const holdings = await fmpService.getEtfHoldings(etf);
              if (!holdings || holdings.length === 0) continue;

              // DETERMINISTIC: Find largest holding
              // Real Logic: If weight > 20%, flag as Concentration Risk
              const topHolding = holdings.sort((a: any, b: any) => (b.weightPercentage || 0) - (a.weightPercentage || 0))[0];

              if (topHolding && topHolding.weightPercentage > 20) {
                  signals.push({
                      etf,
                      ticker: topHolding.asset,
                      action: 'SELL',
                      weight_pct: topHolding.weightPercentage,
                      reason: `Concentration Risk: ${topHolding.asset} is ${topHolding.weightPercentage}% of ${etf}`,
                      urgency: 'HIGH'
                  });
              }
          } catch (e) {
              // Ignore failures
          }
      }
      return signals;
  }
}

export default new EtfShadowService();
