import fmpService from './fmpService.js';
import socialSentimentService from './socialSentimentService.js';

interface WhisperSignal {
  ticker: string;
  whisper_type: 'BULLISH_SETUP' | 'BEARISH_SETUP' | 'NEUTRAL';
  score: number; // 0-100
  details: string;
}

class EarningsWhisperService {

  async analyze(ticker: string): Promise<WhisperSignal> {
    try {
        // 1. Get Analyst Estimates
        const estimates = await fmpService.getAnalystEstimates(ticker);
        if (!estimates) return { ticker, whisper_type: 'NEUTRAL', score: 50, details: "No analyst estimates" };

        const estimatedEPS = estimates.estimatedEpsAvg;
        const analystCount = estimates.numberAnalystEstimatedEps;

        // 2. Get Social Velocity
        const velocity = await socialSentimentService.getSentimentVelocity(ticker);

        // 3. Reconcile (The Whisper Logic)
        // Setup A: "Sandbagged" (Analysts Low + Hype High)
        if (velocity > 20 && analystCount > 3) {
            return {
                ticker,
                whisper_type: 'BULLISH_SETUP',
                score: 85,
                details: `WHISPER BULL: High social momentum (+${velocity.toFixed(0)}%) into earnings. Street expectation: ${estimatedEPS}. Potential breakout.`
            };
        }
        
        // Setup B: "Crowded Long" (Analysts High + Hype High)
        // If velocity is extreme (>50%), might be a "Sell the News" event
        if (velocity > 50) {
            return {
                ticker,
                whisper_type: 'BEARISH_SETUP',
                score: 40,
                details: `WHISPER CAUTION: Extreme hype (+${velocity.toFixed(0)}%). Risk of 'Sell the News'.`
            };
        }

        return { ticker, whisper_type: 'NEUTRAL', score: 50, details: "No divergence detected." };

    } catch (e) {
        return { ticker, whisper_type: 'NEUTRAL', score: 50, details: "Analysis Error" };
    }
  }
}

export default new EarningsWhisperService();
