import fmpService from './fmpService.js';

interface WhisperSignal {
  ticker: string;
  whisper_type: 'BULLISH_SETUP' | 'BEARISH_SETUP' | 'NEUTRAL';
  score: number;
  details: string;
}

class EarningsWhisperService {
  async analyze(ticker: string): Promise<WhisperSignal> {
      try {
          const estimates = await fmpService.getAnalystEstimates(ticker);
          
          // FIX: Explicitly cast to 'any' to avoid empty object type errors
          const est: any = estimates?.[0] || {};
          const estimatedEPS = est.estimatedEpsAvg || 0;
          const analystCount = est.numberAnalystEstimatedEps || 0;

          return {
              ticker,
              whisper_type: 'NEUTRAL',
              score: 50,
              details: `Consensus: ${estimatedEPS} (${analystCount} analysts)`
          };
      } catch (e) {
          return { ticker, whisper_type: 'NEUTRAL', score: 50, details: 'Data unavailable' };
      }
  }
}

export default new EarningsWhisperService();
