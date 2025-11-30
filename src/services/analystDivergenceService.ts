import fmpService from './fmpService.js';

interface DivergenceResult {
  consensus: string; // "Strong Buy", "Hold", "Sell"
  divergenceScore: number; // % difference between High and Low targets
  status: 'CONSENSUS' | 'BATTLEGROUND' | 'UNCERTAIN';
  details: string;
}

class AnalystDivergenceService {

  async analyze(ticker: string, currentPrice: number): Promise<DivergenceResult> {
    try {
      const targets = await fmpService.getPriceTargets(ticker);
      
      if (!targets || targets.length === 0) {
          return { consensus: "Unknown", divergenceScore: 0, status: "UNCERTAIN", details: "No analyst coverage found." };
      }

      // FMP usually returns latest target first, or a list. We want the most recent aggregate.
      // Assuming the API returns a list of targets, we look for the most recent summary or aggregate manually if needed.
      // For v4/price-target, it often returns a list. We'll take the latest one.
      const latest = targets[0];

      // Handle data structure (adjust based on actual API response if needed)
      const high = latest.targetHigh || latest.priceTargetHigh || currentPrice;
      const low = latest.targetLow || latest.priceTargetLow || currentPrice;
      const median = latest.targetMedian || latest.priceTargetAverage || currentPrice;
      
      // 1. Calculate Divergence (Spread)
      // (High - Low) / Current Price
      const spread = high - low;
      const divergenceScore = (spread / currentPrice) * 100;

      // 2. Determine Status
      let status: 'CONSENSUS' | 'BATTLEGROUND' | 'UNCERTAIN' = 'CONSENSUS';
      
      if (divergenceScore > 40) {
          // Huge gap between bulls and bears
          status = 'BATTLEGROUND';
      } else if (divergenceScore < 15) {
          // Everyone agrees
          status = 'CONSENSUS';
      } else {
          status = 'UNCERTAIN';
      }

      // 3. Construct Narrative
      let consensusType = "Hold";
      const upside = ((median - currentPrice) / currentPrice) * 100;
      
      if (upside > 15) consensusType = "Buy";
      if (upside < -5) consensusType = "Sell";

      const details = `Analysts see ${upside > 0 ? '+' : ''}${upside.toFixed(1)}% upside (Median $${median}). Spread: ${divergenceScore.toFixed(1)}%. Status: ${status}.`;

      return {
          consensus: consensusType,
          divergenceScore,
          status,
          details
      };

    } catch (e) {
      return { consensus: "Error", divergenceScore: 0, status: "UNCERTAIN", details: "Analysis failed." };
    }
  }
}

export default new AnalystDivergenceService();
