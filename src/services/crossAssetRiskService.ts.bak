import { pool } from '../db/index.js';
import fmpService from './fmpService.js';
import marketDataService from './marketDataService.js';

interface RiskSnapshot {
  risk_score: number; // 0-100
  regime: 'CALM' | 'CAUTION' | 'STRESS' | 'CRITICAL';
  drivers: string[];
  metrics: {
    yield_spread_10y2y: number;
    credit_spread_hyg_ief: number;
    oil_volatility: number;
    dollar_strength: number;
  };
  confidence_penalty: number; // Amount to deduct from trade confidence
}

class CrossAssetRiskService {

  async analyzeSystemicRisk(): Promise<RiskSnapshot> {
    // console.log("      📉 CARM: Scanning Systemic Plumbing...");

    try {
        // 1. FETCH MACRO DATA
        const [treasury, hyg, ief, uso, uup] = await Promise.all([
            fmpService.getTreasuryRates(),
            marketDataService.getStockPrice('HYG'), // High Yield Bonds
            marketDataService.getStockPrice('IEF'), // 7-10Y Treasury
            marketDataService.getStockPrice('USO'), // Oil
            marketDataService.getStockPrice('UUP')  // Dollar
        ]);

        // 2. CALCULATE METRICS

        // A. Yield Curve (Recession Signal)
        // 10Y - 2Y. Negative = Inversion (Bad)
        let yieldSpread = 0;
        if (treasury && treasury.length > 0) {
            yieldSpread = treasury[0].year10 - treasury[0].year2;
        }

        // B. Credit Spreads (Risk Appetite)
        // Compare Junk Bonds (HYG) to Treasuries (IEF) performance today
        // If HYG is down significantly vs IEF, credit is tightening.
        let creditSpreadDelta = 0;
        if (hyg && ief) {
            creditSpreadDelta = hyg.changePercent - ief.changePercent;
        }

        // C. Commodity Volatility
        const oilVol = uso ? Math.abs(uso.changePercent) : 0;

        // D. Dollar Strength
        const dxyVol = uup ? uup.changePercent : 0;

        // 3. SCORING LOGIC (0 = Safe, 100 = Crash)
        let score = 20; // Baseline risk
        const drivers: string[] = [];

        // Yield Curve Penalty
        if (yieldSpread < -0.5) {
            score += 30;
            drivers.push(`Deep Curve Inversion (${yieldSpread.toFixed(2)}%)`);
        } else if (yieldSpread < 0) {
            score += 15;
            drivers.push(`Curve Inversion (${yieldSpread.toFixed(2)}%)`);
        }

        // Credit Spread Penalty (Risk Off)
        if (creditSpreadDelta < -0.5) {
            score += 20;
            drivers.push("Credit Spreads Widening");
        }

        // Oil Shock
        if (oilVol > 3.0) {
            score += 15;
            drivers.push(`Oil Volatility Shock (${oilVol.toFixed(1)}%)`);
        }

        // Dollar Wrecking Ball
        if (dxyVol > 0.8) {
            score += 15;
            drivers.push("Dollar Spike (Liquidity Drain)");
        }

        // 4. DETERMINE REGIME
        let regime: RiskSnapshot['regime'] = 'CALM';
        let penalty = 0;

        if (score >= 80) {
            regime = 'CRITICAL';
            penalty = 50; // Kill most trades
        } else if (score >= 60) {
            regime = 'STRESS';
            penalty = 25;
        } else if (score >= 40) {
            regime = 'CAUTION';
            penalty = 10;
        }

        const result: RiskSnapshot = {
            risk_score: Math.min(100, score),
            regime,
            drivers,
            metrics: {
                yield_spread_10y2y: yieldSpread,
                credit_spread_hyg_ief: creditSpreadDelta,
                oil_volatility: oilVol,
                dollar_strength: dxyVol
            },
            confidence_penalty: penalty
        };

        await this.persist(result);
        return result;

    } catch (e: any) {
        console.error("CARM Error:", e.message);
        // Fail-safe: Assume Caution if data missing
        return {
            risk_score: 40,
            regime: 'CAUTION',
            drivers: ['Data Unavailable'],
            metrics: { yield_spread_10y2y: 0, credit_spread_hyg_ief: 0, oil_volatility: 0, dollar_strength: 0 },
            confidence_penalty: 10
        };
    }
  }

  private async persist(data: RiskSnapshot) {
      try {
          await pool.query(`
            INSERT INTO cross_asset_risk_snapshots (risk_score, risk_regime, drivers, metrics, snapshot_date)
            VALUES ($1, $2, $3, $4, CURRENT_DATE)
            ON CONFLICT (snapshot_date) DO UPDATE SET
                risk_score = $1, risk_regime = $2, drivers = $3, metrics = $4, created_at = NOW()
          `, [data.risk_score, data.regime, JSON.stringify(data.drivers), JSON.stringify(data.metrics)]);
      } catch (e) {}
  }
}

export default new CrossAssetRiskService();
