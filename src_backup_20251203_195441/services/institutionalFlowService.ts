import fmpService from './fmpService.js';

interface FlowSignal {
  type: 'ROTATION' | 'ACCUMULATION' | 'DUMPING';
  sector?: string;
  ticker?: string;
  intensity: number;
  reason: string;
}

class InstitutionalFlowService {
  
  // List of major sector ETFs to track rotation
  private SECTOR_ETFS = ['XLE', 'XLF', 'XLK', 'XLV', 'XLI', 'XLY', 'XLP', 'XLU', 'XLB'];

  async scanFlows(): Promise<FlowSignal[]> {
      try {
          // Get batch prices for ETFs
          const quotes = await fmpService.getBatchPrices(this.SECTOR_ETFS);
          
          if (!quotes || quotes.length === 0) return [];

          // Sort by performance (changesPercentage)
          // Explicitly cast 'q' to any to avoid "property does not exist on unknown" error
          const sorted = quotes
              .filter((q: any) => q && typeof q.changesPercentage === 'number')
              .sort((a: any, b: any) => b.changesPercentage - a.changesPercentage);

          if (sorted.length < 2) return [];

          const best = sorted[0];
          const worst = sorted[sorted.length - 1];

          const signals: FlowSignal[] = [];

          // Rotation Signal
          if (best.changesPercentage > 1.0 && worst.changesPercentage < -0.5) {
              signals.push({
                  type: 'ROTATION',
                  sector: best.symbol,
                  intensity: 80,
                  reason: `Sector Rotation: Money moving into ${best.symbol} (+${best.changesPercentage}%) from ${worst.symbol}`
              });
          }

          return signals;

      } catch (e) {
          console.error('[FlowService] Error scanning flows:', e);
          return [];
      }
  }

  async checkAccumulation(ticker: string): Promise<FlowSignal | null> {
      try {
          const quote = await fmpService.getPrice(ticker);
          if (!quote) return null;

          const profile = await fmpService.getCompanyProfile(ticker);
          const avgVol = profile?.volAvg || 1000000;

          // Simple Volume Breakout Check
          if (quote.volume > avgVol * 1.5 && quote.changesPercentage > 0) {
              return {
                  type: 'ACCUMULATION',
                  ticker,
                  intensity: 75,
                  reason: `High Volume Buying: ${((quote.volume / avgVol) * 100).toFixed(0)}% of avg volume`
              };
          }
          return null;
      } catch (e) {
          return null;
      }
  }
}

export default new InstitutionalFlowService();
