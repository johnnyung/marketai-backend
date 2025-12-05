import macroRegimeService from './macroRegimeService.js';
import technicalIndicatorsService from './technicalIndicatorsService.js';

interface HedgeSignal {
  ticker: string;
  action: 'BUY';
  reason: string;
  allocation_pct: number;
  confidence: number;
}

class HedgingService {

  // Hedge Instruments
  private hedges = {
    tech_short: 'SQQQ',  // 3x Short Nasdaq
    market_short: 'SPXS', // 3x Short S&P
    volatility: 'VIXY',   // Long VIX
    rates: 'TBT'          // Short Treasuries (Rates Up)
  };

  async calculateHedge(activeSignals: any[]): Promise<HedgeSignal | null> {
    console.log('      🛡️  Calculating Hedge Requirements...');

    // 1. Get Macro Context
    const macro = await macroRegimeService.getRegime();
    
    // 2. Check Market Technicals (SPY)
    const spyTech = await technicalIndicatorsService.getTechnicalIndicators('SPY');
    
    // DEFAULT: No Hedge needed in Bull Market
    if (macro.regime === 'RISK_ON' && spyTech?.overallSignal === 'bullish') {
        return null;
    }

    // SCENARIO A: RISK-OFF / CRASH PROTECTION
    if (macro.regime === 'RISK_OFF') {
        return {
            ticker: this.hedges.market_short,
            action: 'BUY',
            allocation_pct: 5.0,
            confidence: 90,
            reason: `[MACRO HEDGE] Regime is Risk-Off. Hedging downside with ${this.hedges.market_short}.`
        };
    }

    // SCENARIO B: TECH OVERBOUGHT (RSI > 75 on QQQ/SPY)
    if (spyTech && spyTech.rsi > 75) {
        return {
            ticker: this.hedges.volatility,
            action: 'BUY',
            allocation_pct: 3.0,
            confidence: 85,
            reason: `[VOLATILITY HEDGE] Market Overbought (RSI ${spyTech.rsi.toFixed(0)}). Buying VIXY protection.`
        };
    }

    // SCENARIO C: INFLATION SPIKE
    if (macro.indicators.trend === 'Tightening') {
         return {
            ticker: this.hedges.tech_short,
            action: 'BUY',
            allocation_pct: 4.0,
            confidence: 80,
            reason: `[RATE HEDGE] Yields rising (${macro.indicators.yield10y}%). Shorting Tech via SQQQ.`
        };
    }

    return null;
  }
}

export default new HedgingService();
