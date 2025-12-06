import fmpService from './fmpService.js';
import marketDataService from './marketDataService.js';
import { pool } from '../db/index.js';

interface RecessionMetrics {
  probability: number; // 0-100
  regime: 'GROWTH' | 'SLOWDOWN' | 'RECESSION_WATCH' | 'HARD_LANDING';
  signals: {
    yield_curve: string;
    unemployment: string;
    credit_spreads: string;
    manufacturing: string;
  };
  reasoning: string;
}

class RecessionPredictorService {

  async predictRecessionRisk(): Promise<RecessionMetrics> {
    console.log('      📉 Recession Predictor: Analyzing Leading Indicators...');

    let riskScore = 0;
    const signals = {
        yield_curve: "Neutral",
        unemployment: "Stable",
        credit_spreads: "Healthy",
        manufacturing: "Unknown"
    };

    try {
        // 1. YIELD CURVE (10Y - 2Y)
        const treasury = await fmpService.getTreasuryRates();
        // Assuming treasury returns array sorted by date desc
        const current = treasury[0];
        if (current) {
            const spread = current.year10 - current.year2; // 10Y minus 2Y
            if (spread < 0) {
                riskScore += 40; // Inversion is the strongest signal
                signals.yield_curve = `INVERTED (${spread.toFixed(2)}%)`;
            } else if (spread < 0.2) {
                riskScore += 20;
                signals.yield_curve = `FLATTENING (${spread.toFixed(2)}%)`;
            } else {
                signals.yield_curve = `NORMAL (${spread.toFixed(2)}%)`;
            }
        }

        // 2. CREDIT SPREADS (HYG vs IEF)
        // If Junk (HYG) falls faster than Treasuries (IEF), risk is rising
        const quotes = await marketDataService.getMultiplePrices(['HYG', 'IEF']);
        const hyg = quotes.get('HYG');
        const ief = quotes.get('IEF');
        
        if (hyg && ief) {
            // Compare recent performance (Daily change proxy for stress)
            // In a full system, use 1-month relative strength
            const relStr = hyg.changePercent - ief.changePercent;
            if (relStr < -0.5) {
                riskScore += 20;
                signals.credit_spreads = "WIDENING (Stress)";
            } else {
                signals.credit_spreads = "STABLE";
            }
        }

        // 3. ECONOMIC ACTIVITY (PMI)
        // Using ISM Manufacturing PMI via FMP Economic Indicator
        const pmiData = await fmpService.getEconomicIndicator('PMI');
        if (pmiData && pmiData.length > 0) {
            const latestPMI = parseFloat(pmiData[0].value);
            if (latestPMI < 45) {
                riskScore += 25;
                signals.manufacturing = `DEEP CONTRACTION (${latestPMI})`;
            } else if (latestPMI < 50) {
                riskScore += 15;
                signals.manufacturing = `CONTRACTION (${latestPMI})`;
            } else {
                signals.manufacturing = `EXPANSION (${latestPMI})`;
            }
        }

        // 4. UNEMPLOYMENT (Sahm Rule Proxy)
        // Fetch Unemployment Rate
        const unrateData = await fmpService.getEconomicIndicator('Unemployment Rate');
        if (unrateData && unrateData.length > 12) {
            // Sort by date desc
            const sorted = unrateData.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
            const currentU3 = parseFloat(sorted[0].value);
            // Get min of last 12 months
            const last12 = sorted.slice(0, 12).map((d: any) => parseFloat(d.value));
            const lowU3 = Math.min(...last12);
            
            // Sahm Rule: Current > Low + 0.5
            if (currentU3 >= (lowU3 + 0.5)) {
                riskScore += 30; // Very strong recession signal
                signals.unemployment = `SAHM RULE TRIGGERED (${currentU3}%)`;
            } else {
                signals.unemployment = `STABLE (${currentU3}%)`;
            }
        }

        // Normalize Score
        riskScore = Math.min(100, riskScore);

        // Determine Regime
        let regime: RecessionMetrics['regime'] = 'GROWTH';
        if (riskScore > 75) regime = 'HARD_LANDING';
        else if (riskScore > 50) regime = 'RECESSION_WATCH';
        else if (riskScore > 30) regime = 'SLOWDOWN';

        // Save Snapshot
        await this.saveForecast(riskScore, regime, signals);

        const reasoning = `Recession Probability: ${riskScore}%. Regime: ${regime}. Yields: ${signals.yield_curve}. Jobs: ${signals.unemployment}.`;
        console.log(`      -> ${reasoning}`);

        return {
            probability: riskScore,
            regime,
            signals,
            reasoning
        };

    } catch (e) {
        console.error("Recession Predictor Error:", e);
        return {
            probability: 10, // Default baseline risk
            regime: 'GROWTH',
            signals,
            reasoning: 'Data unavailable, assuming base rate growth.'
        };
    }
  }

  private async saveForecast(prob: number, regime: string, signals: any) {
      try {
          await pool.query(`
            INSERT INTO recession_forecasts
            (forecast_date, recession_probability, yield_curve_status, credit_stress_level, sahm_rule_triggered, pmi_status, details)
            VALUES (CURRENT_DATE, $1, $2, $3, $4, $5, $6)
          `, [
              prob,
              signals.yield_curve.split(' ')[0],
              signals.credit_spreads.split(' ')[0],
              signals.unemployment.includes('TRIGGERED'),
              signals.manufacturing.split(' ')[0],
              regime
          ]);
      } catch(e) {}
  }
}

export default new RecessionPredictorService();
