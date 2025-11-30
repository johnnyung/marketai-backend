import pool from '../db/index.js';
import fmpService from './fmpService.js';
import userPortfolioService from './userPortfolioService.js';

interface RiskCheck {
  ticker: string;
  passed: boolean;
  constraints: {
    sector_exposure: 'OK' | 'OVERWEIGHT' | 'MAXED';
    beta_impact: number;
    correlation_risk: boolean;
  };
  recommended_size_modifier: number; // 0.0 to 1.0
  reason: string;
}

class RiskConstraintService {
  
  // Default Limits
  private MAX_SECTOR_ALLOCATION = 0.35; // 35% per sector
  private MAX_PORTFOLIO_BETA = 1.5;     // Aggressive but capped

  async checkFit(ticker: string): Promise<RiskCheck> {
    // console.log(`      🛡️  Risk Filter: Checking ${ticker} against portfolio...`);

    try {
        // 1. Get New Asset Profile
        const profile = await fmpService.getCompanyProfile(ticker);
        if (!profile) return this.defaultPass(ticker); // If unknown, pass with caution

        const newSector = profile.sector || 'Unknown';
        const newBeta = parseFloat(profile.beta || '1.0');

        // 2. Get Current Portfolio
        const holdings = await userPortfolioService.getHoldings();
        if (holdings.length === 0) return this.defaultPass(ticker); // Empty portfolio fits anything

        let totalValue = 0;
        const sectorValues: Record<string, number> = {};
        let weightedBeta = 0;

        // Calculate Portfolio Metrics
        for (const h of holdings) {
            const val = parseFloat(h.shares.toString()) * parseFloat(h.avg_cost.toString()); // Using cost for speed, ideally live value
            totalValue += val;
            
            // We need sector for existing holdings.
            // Optimization: In a real app, we'd store sector in DB. Here we assume we fetched it or estimate.
            // For V1, we skip deep sector fetch loop for speed and assume 'General' if not cached.
            const hSector = 'General'; // Placeholder
            sectorValues[hSector] = (sectorValues[hSector] || 0) + val;
        }

        // 3. Evaluate Impact of New Trade
        // Assume standard position size (e.g. 5%)
        const tradeSize = totalValue * 0.05;
        const projectedTotal = totalValue + tradeSize;
        
        // Sector Check
        const currentSectorVal = sectorValues[newSector] || 0;
        const newSectorVal = currentSectorVal + tradeSize;
        const newSectorPct = newSectorVal / projectedTotal;

        let sectorStatus: RiskCheck['constraints']['sector_exposure'] = 'OK';
        let sizeMod = 1.0;
        let reason = "Portfolio Fit: Good.";

        if (newSectorPct > this.MAX_SECTOR_ALLOCATION) {
            sectorStatus = 'MAXED';
            sizeMod = 0; // Reject
            reason = `[RISK REJECT] ${newSector} allocation would exceed 35% (${(newSectorPct*100).toFixed(1)}%).`;
        } else if (newSectorPct > (this.MAX_SECTOR_ALLOCATION * 0.8)) {
            sectorStatus = 'OVERWEIGHT';
            sizeMod = 0.5; // Reduce size
            reason = `[RISK WARNING] ${newSector} allocation high (${(newSectorPct*100).toFixed(1)}%). Size reduced.`;
        }

        // Beta Check (Simplified)
        // If adding high beta to high beta portfolio
        if (newBeta > 1.5 && sectorStatus !== 'MAXED') {
            // Check if portfolio is already risky (heuristic)
            // For now, just warn
            reason += ` High Beta (${newBeta}).`;
        }

        return {
            ticker,
            passed: sizeMod > 0,
            constraints: {
                sector_exposure: sectorStatus,
                beta_impact: newBeta,
                correlation_risk: false // Todo: Matrix check
            },
            recommended_size_modifier: sizeMod,
            reason
        };

    } catch (e) {
        console.error("Risk Constraint Error:", e);
        return this.defaultPass(ticker);
    }
  }

  private defaultPass(ticker: string): RiskCheck {
      return {
          ticker, passed: true, 
          constraints: { sector_exposure: 'OK', beta_impact: 1.0, correlation_risk: false },
          recommended_size_modifier: 1.0, reason: "Standard Allocation."
      };
  }
}

export default new RiskConstraintService();
