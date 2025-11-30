import pool from '../db/index.js';

interface ConsensusScore {
  final_score: number;
  breakdown: { macro: number; technical: number; sentiment: number; insider: number; valuation: number; };
  regime_adjustment: number;
  confidence_tier: 'HIGH' | 'MEDIUM' | 'LOW';
}

class CrossSignalConsensusEngine {
  private REGIME_WEIGHTS = {
    'RISK_ON': { macro: 0.2, technical: 0.3, sentiment: 0.3, insider: 0.1, valuation: 0.1 },
    'RISK_OFF': { macro: 0.4, technical: 0.2, sentiment: 0.1, insider: 0.1, valuation: 0.2 },
    'RECOVERY': { macro: 0.3, technical: 0.2, sentiment: 0.1, insider: 0.2, valuation: 0.2 },
    'BUBBLE':   { macro: 0.1, technical: 0.4, sentiment: 0.4, insider: 0.1, valuation: 0.0 }
  };

  async calculateScore(ticker: string, inputs: any): Promise<ConsensusScore> {
    const safeInputs = inputs || {};
    const regimeData = safeInputs.regime || {};
    const sentimentData = safeInputs.sentiment || {};
    const insiderData = safeInputs.insider || {};

    const regimeType = regimeData.current_regime || 'RISK_ON';
    const weights = this.REGIME_WEIGHTS[regimeType as keyof typeof this.REGIME_WEIGHTS] || this.REGIME_WEIGHTS['RISK_ON'];

    const scores = {
      macro: this.normalize(safeInputs.macro_score),
      technical: this.normalize(safeInputs.technical_score),
      sentiment: this.normalize(sentimentData.score || safeInputs.sentiment_score),
      insider: this.normalize(insiderData.confidence || safeInputs.insider_score),
      valuation: this.normalize(safeInputs.valuation_score)
    };

    let weightedScore =
      (scores.macro * weights.macro) +
      (scores.technical * weights.technical) +
      (scores.sentiment * weights.sentiment) +
      (scores.insider * weights.insider) +
      (scores.valuation * weights.valuation);

    let adjustment = 0;
    const vix = sentimentData.metrics?.vix || 20;
    if (vix > 25) { adjustment = -15; weightedScore += adjustment; }

    let tier: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
    if (weightedScore >= 80) tier = 'HIGH';
    else if (weightedScore >= 60) tier = 'MEDIUM';

    return {
      final_score: Math.max(0, Math.min(100, Math.round(weightedScore))),
      breakdown: scores,
      regime_adjustment: adjustment,
      confidence_tier: tier
    };
  }

  private normalize(val: any): number {
      if (typeof val !== 'number') return 50;
      return Math.max(0, Math.min(100, val));
  }
}
export default new CrossSignalConsensusEngine();
