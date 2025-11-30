import portfolioManagerService from './portfolioManagerService.js';
import drawdownSensitivityService from './drawdownSensitivityService.js';

export interface TradePlan {
  entry_primary: number;
  entry_secondary: number;
  stop_loss: number;
  soft_stop: number;
  take_profit_1: number;
  take_profit_2: number;
  take_profit_3: number;
  allocation_percent: number;
  max_allocation: number;
  time_horizon: string;
  expected_catalyst_window: string;
  risk_reward_ratio: number;
  if_then_map: string[];
  advanced_explanation: string;
}

class TradeArchitectService {

  async constructPlan(
    ticker: string,
    price: number,
    confidence: number,
    volProfile: 'High' | 'Medium' | 'Low',
    tier: string,
    engines: any
  ): Promise<TradePlan> {
    
    const gamma = engines.gamma?.volatility_regime || 'NEUTRAL';
    const shadow = engines.shadow?.bias || 'NEUTRAL';
    const narrative = engines.narrative?.pressure_score || 50;
    const regime = engines.regime?.current_regime || 'NEUTRAL';
    const insider = engines.insider?.classification || 'UNKNOWN';
    const divergence = engines.fractal?.divergence_type || 'NONE';
    
    const vsaMod = engines.vsa?.stop_width_modifier || 1.0;
    const vsaRegime = engines.vsa?.regime || 'NORMAL';

    const rtdBuffer = engines.rtd?.recommended_buffer || 0;
    const isTrap = engines.rtd?.is_trap_zone || false;

    // SMCW
    const seasonalVol = engines.smcw?.volatility_factor || 1.0;
    const isFomc = engines.smcw?.is_fomc || false;

    const dsc = await drawdownSensitivityService.getRiskProfile(tier);

    // BASE VOLATILITY
    let volatilityPct = 0.04;
    if (volProfile === 'High') volatilityPct = 0.08;
    if (volProfile === 'Low') volatilityPct = 0.02;
    
    // MODIFIERS
    if (gamma === 'AMPLIFIED') volatilityPct *= 1.5;
    if (gamma === 'SUPPRESSED') volatilityPct *= 0.8;
    volatilityPct *= dsc.stop_loss_modifier;
    volatilityPct *= vsaMod;
    volatilityPct *= seasonalVol;

    if (isTrap) volatilityPct += (rtdBuffer / 100);

    // STOP LOSS
    const stopDist = price * volatilityPct;
    let stopLoss = Number((price - stopDist).toFixed(2));
    
    if (divergence === 'HIDDEN_BULL') {
        stopLoss = Number((price - (stopDist * 0.7)).toFixed(2));
    }
    const softStop = Number((price - (stopDist * 0.6)).toFixed(2));

    // ENTRY
    let entryPrimary = price;
    let entrySecondary = Number((price * 0.98).toFixed(2));

    if (isTrap) {
        entryPrimary = Number((price * 0.98).toFixed(2));
        entrySecondary = Number((price * 0.95).toFixed(2));
    } else if (shadow === 'ACCUMULATION') {
        entrySecondary = Number((price * 0.99).toFixed(2));
    }

    // TARGETS
    const risk = price - stopLoss;
    let rewardMult = 1.0;
    if (narrative > 75) rewardMult = 1.3;
    if (regime === 'RISK_OFF') rewardMult = 0.7;

    const tp1 = Number((price + (risk * 1.5 * rewardMult)).toFixed(2));
    const tp2 = Number((price + (risk * 3.0 * rewardMult)).toFixed(2));
    const tp3 = Number((price + (risk * 5.0 * rewardMult)).toFixed(2));

    // SIZING
    let baseAlloc = portfolioManagerService.calculateAllocation(tier, confidence, volProfile);
    let allocPct = baseAlloc.pct;

    if (insider === 'OPPORTUNISTIC' || insider === 'COORDINATED') allocPct = Math.min(allocPct * 1.25, 10);
    if (regime === 'STAGFLATION' || regime === 'RECESSION') allocPct *= 0.5;
    if (vsaRegime === 'EXTREME') allocPct *= 0.5;
    if (isTrap) allocPct *= 0.8;
    if (isFomc) allocPct *= 0.75;

    const maxAlloc = Number((allocPct * 1.5).toFixed(1));

    // IF/THEN
    const ifThen: string[] = [];
    if (isFomc) ifThen.push(`CAUTION: FOMC Week. Size reduced.`);
    if (isTrap) ifThen.push(`WARNING: Reversal Trap History.`);
    if (vsaRegime === 'HIGH') ifThen.push(`ALERT: High Volatility Regime.`);

    const rrRatio = Number(((tp2 - price) / (price - stopLoss)).toFixed(2));
    
    let horizon = "1-4 Weeks";
    if (tier === 'blue_chip') horizon = "3-12 Months";
    if (engines.catalyst?.has_catalyst) horizon = "Event Driven (Days)";

    // FIXED: Explicitly mention DSC
    const advancedEx = `
      Alpha Setup: ${divergence !== 'NONE' ? divergence : 'Trend'}.
      Risk Profile: ${volProfile} Vol. DSC Drawdown Protection: ${dsc.stop_loss_modifier}x.
      Edge: ${insider === 'OPPORTUNISTIC' ? 'Insider Alignment' : 'Statistical Reversion'}.
      Stop placed at ${stopLoss} (${(volatilityPct*100).toFixed(1)}% distance).
    `.trim();

    return {
      entry_primary: entryPrimary,
      entry_secondary: entrySecondary,
      stop_loss: stopLoss,
      soft_stop: softStop,
      take_profit_1: tp1,
      take_profit_2: tp2,
      take_profit_3: tp3,
      allocation_percent: parseFloat(allocPct.toFixed(1)),
      max_allocation: maxAlloc,
      time_horizon: horizon,
      expected_catalyst_window: engines.catalyst?.catalyst_event || 'Price Action',
      risk_reward_ratio: rrRatio,
      if_then_map: ifThen,
      advanced_explanation: advancedEx
    };
  }
}

export default new TradeArchitectService();
