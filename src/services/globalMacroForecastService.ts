import fmpService from './fmpService.js';

class GlobalMacroForecastService {
  async generateForecast() {
    try {
        const gdp = await fmpService.getEconomicData('GDP');
        const val = gdp && gdp[0] ? parseFloat(gdp[0].value) : 0;
        
        return {
            health_score: val > 0 ? 70 : 30,
            inflation: { trend: 'UNKNOWN', cpi: 0, ppi: 0 },
            growth: { trend: val > 0 ? 'EXPANDING' : 'CONTRACTING', gdp: val, unemployment: 0 },
            liquidity: { trend: 'UNKNOWN', fed_rate: 0, yield_curve: 0 },
            currency: { dxy: 0, impact: 'UNKNOWN' },
            summary: `GDP: ${val}%`
        };
    } catch (e) {
        return { health_score: 0, inflation: { trend: 'UNKNOWN', cpi: 0, ppi: 0 }, growth: { trend: 'UNKNOWN', gdp: 0, unemployment: 0 }, liquidity: { trend: 'UNKNOWN', fed_rate: 0, yield_curve: 0 }, currency: { dxy: 0, impact: 'UNKNOWN' }, summary: 'Data Unavailable' };
    }
  }
}
export default new GlobalMacroForecastService();
