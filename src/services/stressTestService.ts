interface StressResult {
  ticker: string;
  resilience_score: number; // 0-100 (100 = Immune, 0 = Fragile)
  max_drawdown_scenario: string;
  allocation_modifier: number; // 0.5 to 1.0
  warnings: string[];
}

class StressTestService {

  // Simulates how a stock behaves under 3 extreme conditions
  // Based on Sector sensitivity heuristics (Phase 1)
  async runScenarios(ticker: string, sector: string): Promise<StressResult> {
    const warnings: string[] = [];
    let resilience = 100;
    
    // SCENARIO 1: INFLATION SHOCK (10Y Yields +0.5%)
    // Hurts: Tech, Real Estate, Utilities (High duration/debt)
    // Helps: Financials, Energy
    let inflationImpact = 0;
    if (['Technology', 'Real Estate', 'Utilities'].includes(sector)) {
        inflationImpact = -15;
        warnings.push("Vulnerable to Rate Hikes");
    } else if (['Financial Services', 'Energy'].includes(sector)) {
        inflationImpact = +5; // Hedge
    }

    // SCENARIO 2: GEOPOLITICAL SPIKE (Oil +20%)
    // Hurts: Consumer, Airlines, Logistics
    // Helps: Energy, Defense
    let oilImpact = 0;
    if (['Consumer Cyclical', 'Industrials', 'Transportation'].includes(sector)) {
        oilImpact = -10;
        warnings.push("Vulnerable to Energy Costs");
    } else if (['Energy', 'Aerospace & Defense'].includes(sector)) {
        oilImpact = +20;
    }

    // SCENARIO 3: TECH CRASH (Nasdaq -15%)
    // Hurts: Tech, Growth, Crypto
    // Helps: Consumer Defensive, Healthcare (Flight to safety)
    let crashImpact = 0;
    if (['Technology', 'Communication Services'].includes(sector) || ticker === 'BTCUSD') {
        crashImpact = -20; // High Beta
        warnings.push("High Correlation to Tech Crash");
    } else if (['Healthcare', 'Consumer Defensive'].includes(sector)) {
        crashImpact = -5; // Low Beta
    } else {
        crashImpact = -10; // Market Beta
    }

    // Calculate Resilience
    // Resilience is reduced by negative impacts
    if (inflationImpact < 0) resilience += inflationImpact * 2;
    if (oilImpact < 0) resilience += oilImpact * 2;
    if (crashImpact < 0) resilience += crashImpact * 2;
    
    // Clamp 0-100
    resilience = Math.max(0, Math.min(100, resilience));

    // Calculate Allocation Modifier
    // If Resilience < 50, cut position size
    let modifier = 1.0;
    if (resilience < 40) modifier = 0.5;      // Very Fragile -> 50% cut
    else if (resilience < 60) modifier = 0.75; // Fragile -> 25% cut
    else if (resilience > 80) modifier = 1.1;  // Robust -> 10% boost

    // Identify Worst Case
    const worst = Math.min(inflationImpact, oilImpact, crashImpact);
    let scenarioName = "None";
    if (worst === inflationImpact) scenarioName = "Inflation Shock";
    if (worst === oilImpact) scenarioName = "Oil Spike";
    if (worst === crashImpact) scenarioName = "Tech Crash";

    return {
        ticker,
        resilience_score: resilience,
        max_drawdown_scenario: scenarioName,
        allocation_modifier: modifier,
        warnings
    };
  }
}

export default new StressTestService();
