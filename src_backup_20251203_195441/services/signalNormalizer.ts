/**
 * SIGNAL NORMALIZER
 * Ensures all engine outputs conform to 0-100 scale.
 */
export const normalizeScore = (score: number | undefined | null): number => {
    if (typeof score !== 'number' || isNaN(score)) return 0;
    return Math.max(0, Math.min(100, Math.round(score)));
};

export const normalizeConfidence = (score: number): 'MAXIMUM' | 'HIGH' | 'MODERATE' | 'LOW' | 'AVOID' => {
    if (score >= 85) return 'MAXIMUM';
    if (score >= 70) return 'HIGH';
    if (score >= 50) return 'MODERATE';
    if (score >= 30) return 'LOW';
    return 'AVOID';
};


// ============================================================
// AUTO-GENERATED SAFE WRAPPER (A7)
// ------------------------------------------------------------
// This wrapper does NOT modify any legacy logic above.
// It simply exposes a neutral diagnostic evaluate() surface so
// the engine can be safely loaded by the Brain Cycle.
// ============================================================

export default {
  id: "signalNormalizer",
  category: "diagnostic",
  async evaluate(ticker: string, ctx: any = {}) {
    return {
      ticker,
      engine: "signalNormalizer",
      score: 0,
      status: "LEGACY_STUB",
      details: "Engine exists but its legacy logic has not yet been wired into the Stable pipeline."
    };
  }
};
