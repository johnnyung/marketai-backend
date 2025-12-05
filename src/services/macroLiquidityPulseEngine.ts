import fmpService from './fmpService.js';

class MacroLiquidityPulseEngine {
  async analyze() {
    try {
      // Use Treasury as primary signal (always available via economic)
      const rates = await fmpService.getTreasuryRates();
      
      let score = 55; // Base score offset from 50
      let detail = 'Neutral';

      if (rates && rates.length > 0) {
          // FMP treasury format varies, look for 10Y
          const tenYear = rates.find((r: any) => r.date && (r.month10 || r.year10)) || rates[0];
          const val = parseFloat(tenYear?.month10 || tenYear?.year10 || '4.0');
          
          // Lower rates = Higher Liquidity = Higher Score
          if (val > 4.5) score = 40;
          else if (val < 3.5) score = 70;
          else score = 60;
          
          detail = `10Y Yield: ${val}%`;
      } else {
          // Attempt GDP fallback
          const gdp = await fmpService.getEconomicData('GDP');
          if (gdp && gdp.length > 0) {
             score = 60; // Assume growth
             detail = 'GDP Growth Data';
          }
      }

      return {
          score,
          regime: score > 50 ? 'NORMAL' : 'RECESSIONARY',
          net_liquidity_trend: score > 50 ? 'RISING' : 'FALLING',
          components: {
              fed_balance_sheet: 'UNKNOWN',
              rrp_flow: 'UNKNOWN'
          },
          details: [detail]
      };

    } catch (e) {
      return {
          score: 0,
          regime: 'UNKNOWN',
          net_liquidity_trend: 'UNKNOWN',
          components: { fed_balance_sheet: 'UNKNOWN', rrp_flow: 'UNKNOWN' },
          details: ['Error']
      };
    }
  }
}

export default new MacroLiquidityPulseEngine();
