import fmpService from './fmpService.js';
import { StubUtils } from '../utils/stubUtils.js';

interface MacroData {
  source: string;
  type: string;
  title: string;
  content: string;
  sentiment?: 'bullish' | 'bearish' | 'neutral';
  metadata: any;
}

class MacroIntelligenceService {
  
  async fetchAll(): Promise<MacroData[]> {
      const [indicators, treasury] = await Promise.all([
          this.fetchEconomicIndicators(),
          this.fetchTreasuryYields()
      ]);
      return [...indicators, ...treasury];
  }

  private async fetchEconomicIndicators(): Promise<MacroData[]> {
      try {
          const gdp = await fmpService.getEconomicIndicator('GDP');
          const cpi = await fmpService.getEconomicIndicator('CPI');
          
          const results: MacroData[] = [];
          
          if (gdp && gdp.length > 0) {
              results.push({
                  source: 'FMP', type: 'macro_gdp', title: 'GDP Update',
                  content: `Latest GDP Reading: ${gdp[0].value}`,
                  metadata: gdp[0]
              });
          }
          if (cpi && cpi.length > 0) {
              results.push({
                  source: 'FMP', type: 'macro_cpi', title: 'CPI Inflation',
                  content: `Latest CPI: ${cpi[0].value}`,
                  metadata: cpi[0]
              });
          }
          return results;
      } catch (e) {
          return [];
      }
  }

  private async fetchTreasuryYields(): Promise<MacroData[]> {
      try {
          const rates = await fmpService.getTreasuryRates();
          if (!rates || !Array.isArray(rates) || rates.length === 0) return [];
          
          return rates.slice(0, 1).map((r: any) => ({
              source: 'FMP',
              type: 'yield_signal',
              title: `10Y Treasury Yield: ${r.date}`,
              content: `10Y Yield at ${r.year10}%`,
              metadata: r
          }));
      } catch (e) { return []; }
  }

  // MVL: Return empty instead of mocks if specific data unavailable
  private async fetchFedSignals() { return []; }
  private async fetchDollarStrength() { return []; }
  private async fetchCommoditySignals() { return []; }
  private async fetchGlobalMarkets() { return []; }
}

export default new MacroIntelligenceService();
