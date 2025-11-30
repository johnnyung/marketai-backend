import fmpService from './fmpService.js';

interface MacroRegime {
  current_regime: 'GOLDILOCKS' | 'REFLATION' | 'STAGFLATION' | 'DEFLATION';
  transition_signal: 'STABLE' | 'TRANSITIONING' | 'VOLATILE';
  next_likely_regime: string;
  probability: number; // 0-100
  metrics: {
    inflation_trend: 'HEATING' | 'COOLING' | 'STABLE';
    growth_trend: 'EXPANDING' | 'CONTRACTING' | 'STABLE';
    yield_curve_slope: number;
  };
  favored_sectors: string[];
  avoid_sectors: string[];
  reason: string;
}

class RegimeTransitionService {

  async detectRegime(): Promise<MacroRegime> {
    // console.log(`      🧭 Macro: Detecting Economic Regime...`);

    try {
        // 1. FETCH DATA
        const [cpiData, gdpData, treasury] = await Promise.all([
            fmpService.getEconomicIndicator('CPI'),
            fmpService.getEconomicIndicator('GDP'), // Or PMI if available
            fmpService.getTreasuryRates()
        ]);

        // 2. ANALYZE INFLATION (CPI MoM Trend)
        let inflationTrend: 'HEATING' | 'COOLING' | 'STABLE' = 'STABLE';
        if (cpiData && cpiData.length > 3) {
            const curr = parseFloat(cpiData[0].value);
            const prev = parseFloat(cpiData[1].value);
            const diff = curr - prev;
            if (diff > 0.1) inflationTrend = 'HEATING';
            else if (diff < -0.1) inflationTrend = 'COOLING';
        }

        // 3. ANALYZE GROWTH (Yield Curve + GDP/PMI Proxy)
        // 10Y-2Y Spread is the best forward growth indicator
        let growthTrend: 'EXPANDING' | 'CONTRACTING' | 'STABLE' = 'STABLE';
        let curveSlope = 0;

        if (treasury && treasury.length > 0) {
            const t = treasury[0];
            curveSlope = t.year10 - t.year2;

            // Steepening curve usually means growth returning (or inflation fears)
            // Inverted curve means recession (contraction) warning
            if (curveSlope < -0.2) growthTrend = 'CONTRACTING';
            else if (curveSlope > 0.5) growthTrend = 'EXPANDING';
        }

        // 4. DETERMINE QUADRANT
        let regime: MacroRegime['current_regime'] = 'GOLDILOCKS';
        let favored: string[] = [];
        let avoid: string[] = [];

        if (growthTrend === 'EXPANDING' || growthTrend === 'STABLE') {
            if (inflationTrend === 'COOLING' || inflationTrend === 'STABLE') {
                regime = 'GOLDILOCKS'; // Best for stocks
                favored = ['Technology', 'Consumer Discretionary', 'Financials'];
                avoid = ['Utilities', 'Gold'];
            } else {
                regime = 'REFLATION'; // Good for stocks, bad for bonds
                favored = ['Energy', 'Industrials', 'Materials', 'Financials'];
                avoid = ['Technology', 'Consumer Staples']; // Rate sensitivity
            }
        } else { // CONTRACTING
            if (inflationTrend === 'HEATING') {
                regime = 'STAGFLATION'; // Worst for everything except commodities
                favored = ['Energy', 'Gold', 'Cash'];
                avoid = ['Technology', 'Consumer Discretionary', 'Industrials'];
            } else {
                regime = 'DEFLATION'; // Recession
                favored = ['Utilities', 'Healthcare', 'Bonds', 'Consumer Staples'];
                avoid = ['Energy', 'Financials', 'Industrials'];
            }
        }

        // 5. DETECT TRANSITION
        // If curve is rapidly steepening from inversion -> Transition to Recovery (Reflation)
        let transition = 'STABLE';
        let nextRegime = regime;
        let probability = 90;

        if (curveSlope < 0 && curveSlope > -0.15) {
             transition = 'TRANSITIONING';
             nextRegime = 'REFLATION'; // Coming out of inversion
             probability = 65;
        }

        const reason = `Regime: ${regime}. Growth is ${growthTrend} (Curve: ${curveSlope.toFixed(2)}%). Inflation is ${inflationTrend}.`;

        return {
            current_regime: regime,
            transition_signal: transition as any,
            next_likely_regime: nextRegime,
            probability,
            metrics: {
                inflation_trend: inflationTrend,
                growth_trend: growthTrend,
                yield_curve_slope: curveSlope
            },
            favored_sectors: favored,
            avoid_sectors: avoid,
            reason
        };

    } catch (e) {
        console.error("Regime Detection Error:", e);
        return {
            current_regime: 'GOLDILOCKS', transition_signal: 'STABLE', next_likely_regime: 'SAME',
            probability: 50, metrics: { inflation_trend: 'STABLE', growth_trend: 'STABLE', yield_curve_slope: 0 },
            favored_sectors: [], avoid_sectors: [], reason: "Data Error"
        };
    }
  }
}

export default new RegimeTransitionService();
