import { ENGINE_WEIGHTS } from './scoringWeightsMatrix.js';
import { normalizeScore, normalizeConfidence } from './signalNormalizer.js';

interface ConsensusScore {
  final_score: number;
  confidence_tier: string;
  breakdown: Record<string, number>;
  active_engines_count: number;
  total_weight_used: number;
}

class CrossSignalConsensusEngine {
  
  /**
   * Calculates weighted consensus score.
   * DYNAMIC LOGIC: If an engine returns 0, it is excluded from the weight calculation.
   * The remaining weights are implicitly scaled up to fill the 100%.
   */
  async calculateScore(ticker: string, inputs: Record<string, number>): Promise<ConsensusScore> {
    
    let weightedSum = 0;
    let totalValidWeight = 0;
    let activeEngines = 0;
    const breakdown: Record<string, number> = {};

    // 1. Iterate Inputs
    for (const [key, rawScore] of Object.entries(inputs)) {
      const score = normalizeScore(rawScore);
      breakdown[key] = score;

      // EXCLUSION LOGIC:
      // If score is 0, we assume Missing Data/Fallback.
      // We do NOT penalize the stock. We simply ignore this engine's opinion.
      if (score > 0) {
        const weight = ENGINE_WEIGHTS[key] || 0.05; // Default 5% for unknown engines
        weightedSum += score * weight;
        totalValidWeight += weight;
        activeEngines++;
      }
    }

    // 2. Compute Final Score
    // If totalValidWeight is 0.5 (50%), and weightedSum is 40, 
    // Final = 40 / 0.5 = 80. (Scaling to 100%)
    
    let finalScore = 50; // Default Neutral if literally everything fails
    
    if (totalValidWeight > 0) {
      finalScore = weightedSum / totalValidWeight;
    }

    // 3. Log Logic (Debug)
    if (process.env.NODE_ENV !== 'test') {
        // console.log(`[Consensus] ${ticker}: Active=${activeEngines} Weight=${totalValidWeight.toFixed(2)} Score=${finalScore.toFixed(2)}`);
    }

    return {
      final_score: Math.round(finalScore),
      confidence_tier: normalizeConfidence(finalScore),
      breakdown,
      active_engines_count: activeEngines,
      total_weight_used: parseFloat(totalValidWeight.toFixed(2))
    };
  }
}

export default new CrossSignalConsensusEngine();
