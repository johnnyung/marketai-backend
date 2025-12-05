import fmpService from './fmpService.js';
import geopoliticalIntelligenceService from './geopoliticalIntelligenceService.js';

interface RiskAssessment {
  level: 'LOW' | 'ELEVATED' | 'CRITICAL';
  drivers: string[];
  regime: 'INFLATIONARY' | 'DEFLATIONARY' | 'STAGFLATION' | 'GOLDILOCKS';
  favored_assets: string[];
}

class GlobalRiskService {

  async assessGlobalRisk(): Promise<RiskAssessment> {
    console.log('      🌍 Assessing Global Risk Matrix...');
    
    const drivers: string[] = [];
    let riskScore = 0;
    const favored: string[] = [];

    // 1. GEOPOLITICAL RISK (War)
    const geoEvents = await geopoliticalIntelligenceService.getGeopoliticalEvents();
    const conflicts = geoEvents.filter(e => e.category === 'conflict').length;
    if (conflicts > 2) {
        riskScore += 30;
        drivers.push("Active Geopolitical Conflicts");
        favored.push("Defense", "Energy", "Gold", "Bitcoin");
    }

    // 2. CURRENCY RISK (Dollar Volatility)
    // We use a simple check on DXY or USD pairs if available, or infer from Gold
    const gold = await fmpService.getPrice('GLD');
    if (gold && Math.abs(gold.changePercent) > 1.5) {
        riskScore += 20;
        drivers.push("Currency/Gold Volatility");
    }

    // 3. COMMODITY SHOCK (Oil)
    const oil = await fmpService.getPrice('USO');
    if (oil && Math.abs(oil.changePercent) > 2.0) {
        riskScore += 25;
        drivers.push(`Oil Volatility (${oil.changePercent}%)`);
        favored.push("Energy", "Utilities");
    }

    // DETERMINE LEVEL
    let level: 'LOW' | 'ELEVATED' | 'CRITICAL' = 'LOW';
    if (riskScore > 50) level = 'CRITICAL';
    else if (riskScore > 20) level = 'ELEVATED';

    // DETERMINE REGIME
    let regime: 'INFLATIONARY' | 'DEFLATIONARY' | 'STAGFLATION' | 'GOLDILOCKS' = 'GOLDILOCKS';
    if (level === 'CRITICAL') regime = 'STAGFLATION';
    else if (level === 'ELEVATED') regime = 'INFLATIONARY';

    // Default Favored
    if (level === 'LOW') favored.push("Technology", "Consumer Cyclical", "Crypto");

    return {
        level,
        drivers,
        regime,
        favored_assets: [...new Set(favored)]
    };
  }
}

export default new GlobalRiskService();
