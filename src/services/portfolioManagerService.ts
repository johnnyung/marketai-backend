class PortfolioManagerService {
  
  /**
   * Calculates optimal position size using Modified Kelly Criterion
   */
  calculateAllocation(
    tier: string,
    confidence: number,
    volatilityProfile: string
  ): { pct: number, kelly: number, reason: string } {
    
    // 1. Determine Win Probability from Confidence
    const winProb = 0.55 + ((confidence - 70) / 30) * 0.20;
    
    // 2. Risk/Reward Ratio
    let riskReward = 2.0;
    if (tier === 'crypto_alpha') riskReward = 3.0;
    if (tier === 'blue_chip') riskReward = 1.5;

    // 3. Kelly Calculation
    let kellyPct = (winProb - (1 - winProb) / riskReward);
    
    // 4. Apply Caps
    let scalar = 0.5;
    let maxCap = 0.05;

    switch(tier) {
        case 'blue_chip':
            maxCap = 0.08;
            scalar = 0.6;
            break;
        case 'explosive_growth':
            maxCap = 0.05;
            scalar = 0.4;
            break;
        case 'sector_play':
            maxCap = 0.04;
            scalar = 0.4;
            break;
        case 'crypto_alpha':
        case 'insider_play':
            maxCap = 0.025;
            scalar = 0.25;
            break;
    }

    if (volatilityProfile === 'High') {
        scalar *= 0.5;
    }

    let allocation = Math.max(0, kellyPct * scalar);
    allocation = Math.min(allocation, maxCap);
    const finalPct = parseFloat((allocation * 100).toFixed(2));
    
    const reason = `Kelly Score: ${kellyPct.toFixed(2)}. Capped at ${maxCap*100}%. Volatility: ${volatilityProfile}.`;

    return { pct: finalPct, kelly: kellyPct, reason };
  }

  /**
   * Calculates Dynamic Exit Points (Stop Loss & Target)
   */
  calculateRiskParameters(
      entryPrice: number,
      tier: string,
      volatilityProfile: string
  ): { stopLoss: number, targetPrice: number, stopPct: number, targetPct: number } {
      
      // Base Risk Percentages by Tier
      let baseStopPct = 0.07; // 7%
      let baseTargetPct = 0.15; // 15%

      switch(tier) {
          case 'blue_chip':
              baseStopPct = 0.05;  // Tight stop for safe stocks
              baseTargetPct = 0.10;
              break;
          case 'explosive_growth':
              baseStopPct = 0.10;  // Looser for volatile growth
              baseTargetPct = 0.25;
              break;
          case 'crypto_alpha':
              baseStopPct = 0.15;  // Very loose for crypto
              baseTargetPct = 0.45; // 3:1 R/R
              break;
          case 'insider_play':
              baseStopPct = 0.08;
              baseTargetPct = 0.20;
              break;
      }

      // Adjust for Current Volatility Regime
      if (volatilityProfile === 'High') {
          baseStopPct *= 1.2; // Widen stops in high vol to avoid noise wicks
          baseTargetPct *= 1.2;
      } else if (volatilityProfile === 'Low') {
          baseStopPct *= 0.8; // Tighten stops in low vol
      }

      const stopLoss = entryPrice * (1 - baseStopPct);
      const targetPrice = entryPrice * (1 + baseTargetPct);

      return {
          stopLoss: parseFloat(stopLoss.toFixed(2)),
          targetPrice: parseFloat(targetPrice.toFixed(2)),
          stopPct: parseFloat((baseStopPct * 100).toFixed(1)),
          targetPct: parseFloat((baseTargetPct * 100).toFixed(1))
      };
  }
}

export default new PortfolioManagerService();
