/**
 * drift_detector — SAFE STUB (A8)
 * ------------------------------------------------
 * This is a placeholder diagnostic engine created by A8
 * in SAFE MODE. It does NOT call external services.
 * It returns a neutral diagnostic result.
 */
export interface DiagnosticResult {
  id: string;
  status: "OK" | "WARN" | "ERROR";
  score: number;
  details: Record<string, any>;
}

export interface DiagnosticEngine {
  id: string;
  description: string;
  evaluate: (ticker: string, context: any) => Promise<DiagnosticResult>;
}

const driftDetector: DiagnosticEngine = {
  id: "drift_detector",
  description: "Detects regime drift or behavior changes between historical and live signals.",
  async evaluate(ticker: string, context: any): Promise<DiagnosticResult> {
    return {
      id: "drift_detector",
      status: "OK",
      score: 0,
      details: {
        safeStub: true,
        reason: "A8 SAFE STUB — not yet fully implemented.",
        ticker,
      },
    };
  },
};

export default driftDetector;
