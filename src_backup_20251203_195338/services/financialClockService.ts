import fmpService from './fmpService.js';

interface ClockState {
  phase: 'RECOVERY' | 'EXPANSION' | 'STAGFLATION' | 'RECESSION';
  growth_trend: 'RISING' | 'FALLING';
  inflation_trend: 'RISING' | 'FALLING';
  playbook: string[];
  favored_sectors: string[];
}

class FinancialClockService {

  async getClockState(): Promise<ClockState> {
    console.log('      🕰️  Financial Clock: Determining Cycle Phase...');

    try {
      // 1. Get Data (GDP & CPI)
      // Note: FMP Economic Indicator returns chronological data
      const [gdpData, cpiData] = await Promise.all([
          fmpService.getEconomicIndicator('GDP'),
          fmpService.getEconomicIndicator('CPI')
      ]);

      // 2. Calculate Trends (Rate of Change)
      // We compare current vs 3 months ago (approx) to filter noise
      const growthTrend = this.calculateTrend(gdpData);
      const inflationTrend = this.calculateTrend(cpiData);

      // 3. Determine Phase
      let phase: ClockState['phase'] = 'EXPANSION'; // Default assumption
      let playbook: string[] = [];
      let sectors: string[] = [];

      if (growthTrend === 'RISING' && inflationTrend === 'FALLING') {
          phase = 'RECOVERY';
          playbook = ['Buy Growth Stocks', 'Buy Cyclicals', 'Sell Commodities'];
          sectors = ['Technology', 'Consumer Cyclical', 'Financial Services'];
      }
      else if (growthTrend === 'RISING' && inflationTrend === 'RISING') {
          phase = 'EXPANSION';
          playbook = ['Buy Hard Assets', 'Buy Value', 'Short Bonds'];
          sectors = ['Industrials', 'Basic Materials', 'Energy', 'Technology'];
      }
      else if (growthTrend === 'FALLING' && inflationTrend === 'RISING') {
          phase = 'STAGFLATION';
          playbook = ['Defensive Rotation', 'Cash is King', 'Buy Gold/Oil'];
          sectors = ['Energy', 'Utilities', 'Healthcare'];
      }
      else if (growthTrend === 'FALLING' && inflationTrend === 'FALLING') {
          phase = 'RECESSION';
          playbook = ['Buy Bonds', 'Buy Quality', 'Short Speculation'];
          sectors = ['Consumer Defensive', 'Utilities', 'Healthcare'];
      }

      console.log(`      -> Phase Detected: ${phase} (Growth: ${growthTrend}, Inflation: ${inflationTrend})`);

      return {
          phase,
          growth_trend: growthTrend,
          inflation_trend: inflationTrend,
          playbook,
          favored_sectors: sectors
      };

    } catch (e) {
      console.error("Clock Error:", e);
      // Safe fallback
      return {
          phase: 'EXPANSION',
          growth_trend: 'RISING',
          inflation_trend: 'RISING',
          playbook: ['Balanced Portfolio'],
          favored_sectors: ['Technology', 'Healthcare']
      };
    }
  }

  private calculateTrend(data: any[]): 'RISING' | 'FALLING' {
      if (!data || data.length < 4) return 'RISING';
      
      // Data comes newest first. Compare index 0 (Current) vs index 3 (Previous Qtr/Month)
      const current = parseFloat(data[0].value);
      const past = parseFloat(data[3].value);
      
      return current >= past ? 'RISING' : 'FALLING';
  }
}

export default new FinancialClockService();
