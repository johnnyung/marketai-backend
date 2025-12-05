import fmpService from './fmpService.js';

interface InflationRegime {
  state: 'ACCELERATING' | 'DECELERATING' | 'STABLE';
  cpi_yoy: number;
  trend_description: string;
}

interface SectorAdjustment {
  sector: string;
  modifier: number; // 0.8 to 1.2
  reason: string;
}

class InflationMapService {
  
  private sectorSensitivities: Record<string, { pro_inflation: boolean; defensiveness: number }> = {
    'Technology': { pro_inflation: false, defensiveness: 0.3 },
    'Financial Services': { pro_inflation: true, defensiveness: 0.6 },
    'Healthcare': { pro_inflation: false, defensiveness: 0.9 }, // Pricing power
    'Energy': { pro_inflation: true, defensiveness: 0.5 },
    'Industrials': { pro_inflation: true, defensiveness: 0.6 },
    'Consumer Cyclical': { pro_inflation: false, defensiveness: 0.2 },
    'Consumer Defensive': { pro_inflation: false, defensiveness: 0.8 },
    'Utilities': { pro_inflation: false, defensiveness: 0.7 }, // Rates hurt, but stable
    'Real Estate': { pro_inflation: true, defensiveness: 0.5 }, // Assets rise, but rates hurt
    'Basic Materials': { pro_inflation: true, defensiveness: 0.6 },
    'Communication Services': { pro_inflation: false, defensiveness: 0.4 }
  };

  async getRegime(): Promise<InflationRegime> {
    try {
        // Fetch CPI (Consumer Price Index)
        const cpiData = await fmpService.getEconomicIndicator('CPI');
        
        if (!cpiData || cpiData.length < 3) {
            return { state: 'STABLE', cpi_yoy: 3.0, trend_description: "Data Unavailable, assuming Stable." };
        }

        // Sort descending by date just in case
        const sorted = cpiData.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const current = parseFloat(sorted[0].value);
        const prev = parseFloat(sorted[1].value);
        const trend = current - prev;

        let state: 'ACCELERATING' | 'DECELERATING' | 'STABLE' = 'STABLE';
        
        if (trend > 0.1) state = 'ACCELERATING';
        else if (trend < -0.1) state = 'DECELERATING';

        return {
            state,
            cpi_yoy: current,
            trend_description: `Inflation (CPI) is ${state} (Current: ${current}%, Prev: ${prev}%).`
        };
    } catch (e) {
        return { state: 'STABLE', cpi_yoy: 3.0, trend_description: "Error fetching CPI." };
    }
  }

  async getAdjustment(sector: string): Promise<SectorAdjustment> {
      const regime = await this.getRegime();
      const sensitivity = this.sectorSensitivities[sector] || { pro_inflation: false, defensiveness: 0.5 };
      
      let modifier = 1.0;
      let reason = "";

      if (regime.state === 'ACCELERATING') {
          if (sensitivity.pro_inflation) {
              modifier = 1.15; // Boost Energy/Materials
              reason = `[INFLATION BOOST] ${sector} benefits from rising prices.`;
          } else {
              modifier = sensitivity.defensiveness > 0.7 ? 1.0 : 0.85; // Penalize Tech/Growth, Spare Defensive
              reason = sensitivity.defensiveness > 0.7
                ? `[INFLATION NEUTRAL] ${sector} has pricing power.`
                : `[INFLATION DRAG] ${sector} hurt by rising costs/rates.`;
          }
      } else if (regime.state === 'DECELERATING') {
          if (!sensitivity.pro_inflation) {
              modifier = 1.15; // Boost Tech/Growth
              reason = `[DISINFLATION BOOST] ${sector} benefits from cooling costs/rates.`;
          } else {
              modifier = 0.9; // Penalize Commodities
              reason = `[DISINFLATION DRAG] ${sector} loses pricing power.`;
          }
      } else {
          reason = `[INFLATION NEUTRAL] Macro environment stable.`;
      }

      return { sector, modifier, reason };
  }
}

export default new InflationMapService();
