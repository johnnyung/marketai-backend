import historicalDataService from './historicalDataService.js';
import { TechnicalMath } from '../utils/mathUtils.js';

interface RegimeShift {
  sector: string;
  correlation_vs_spy: number;
  status: 'DECOUPLED' | 'COUPLED' | 'INVERSE';
  implication: string;
  intensity: number; // 0-100
}

const SECTORS = [
    'XLK', // Tech
    'XLE', // Energy
    'XLF', // Financials
    'XLV', // Healthcare
    'XLI', // Industrials
    'XLP', // Staples
    'XLY', // Discretionary
    'XLU', // Utilities
    'XLB', // Materials
    'XLRE', // Real Estate
    'XLC'  // Comms
];

class SectorCorrelationService {

  async detectRegimeShifts(): Promise<RegimeShift[]> {
    console.log('      📊 Sector Matrix: Calculating Live Correlations...');
    const shifts: RegimeShift[] = [];

    try {
        // 1. Get Benchmark History (SPY)
        const spyHist = await historicalDataService.getStockHistory('SPY', 60); // 60 Days
        if (spyHist.length < 30) return [];
        const spyPrices = spyHist.map(h => h.price);
        const spyReturns = TechnicalMath.getReturns(spyPrices);

        // 2. Analyze Sectors
        for (const sector of SECTORS) {
            const sectHist = await historicalDataService.getStockHistory(sector, 60);
            if (sectHist.length < 30) continue;

            const sectPrices = sectHist.map(h => h.price);
            const sectReturns = TechnicalMath.getReturns(sectPrices);

            // 3. Calculate Correlation
            // We need matching lengths
            const len = Math.min(spyReturns.length, sectReturns.length);
            const spySlice = spyReturns.slice(-len);
            const sectSlice = sectReturns.slice(-len);

            const correlation = this.calculateCorrelation(spySlice, sectSlice);
            
            // 4. Detect Regime
            // Normal: > 0.7 (Moving with market)
            // Decoupled: 0.3 to -0.3 (Doing its own thing - Alpha source)
            // Inverse: < -0.5 (Hedge / Defensive)

            if (correlation < 0.3 && correlation > -0.3) {
                shifts.push({
                    sector,
                    correlation_vs_spy: correlation,
                    status: 'DECOUPLED',
                    implication: 'Idiosyncratic Alpha (Non-correlated move)',
                    intensity: 80
                });
                console.log(`      -> ⛓️  DECOUPLED: ${sector} (Corr: ${correlation.toFixed(2)})`);
            } else if (correlation < -0.5) {
                shifts.push({
                    sector,
                    correlation_vs_spy: correlation,
                    status: 'INVERSE',
                    implication: 'Defensive/Hedge Rotation',
                    intensity: 90
                });
                console.log(`      -> 🛡️  INVERSE: ${sector} (Corr: ${correlation.toFixed(2)})`);
            }
        }
        
        return shifts;

    } catch (e) {
        console.error("Sector Matrix Error:", e);
        return [];
    }
  }

  private calculateCorrelation(x: number[], y: number[]): number {
      const n = x.length;
      const sumX = x.reduce((a, b) => a + b, 0);
      const sumY = y.reduce((a, b) => a + b, 0);
      const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
      const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
      const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

      const numerator = (n * sumXY) - (sumX * sumY);
      const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

      return denominator === 0 ? 0 : numerator / denominator;
  }
}

export default new SectorCorrelationService();
