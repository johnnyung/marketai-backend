import fmpService from './fmpService.js';
import macroRegimeService from './macroRegimeService.js';
import socialSentimentService from './socialSentimentService.js';
import technicalIndicatorsService from './technicalIndicatorsService.js';

interface ConsensusResult {
  ticker: string;
  score: number;
  passed: boolean;
  factors: {
    macro: boolean;
    insider: boolean;
    technical: boolean;
    sentiment: boolean;
    correlation: boolean;
  };
  details: string[];
}

class ConsensusEngine {

  // Added 'tier' parameter to adjust difficulty based on asset class
  async validate(ticker: string, sector?: string, tier?: string): Promise<ConsensusResult> {
    console.log(`      ⚖️  Running Consensus Check on ${ticker} (${tier || 'General'})...`);
    
    const factors = {
      macro: false,
      insider: false,
      technical: false,
      sentiment: false,
      correlation: false
    };
    const details: string[] = [];

    // 1. MACRO CHECK
    try {
      const regime = await macroRegimeService.getRegime();
      const isDefensive = ['Healthcare', 'Utilities', 'Consumer Defensive', 'Energy', 'Financial', 'Industrials', 'Aerospace & Defense'].includes(sector || '');
      const isGrowth = ['Technology', 'Communication Services', 'Consumer Cyclical'].includes(sector || '');
      
      if (regime.regime === 'RISK_ON' && isGrowth) {
        factors.macro = true;
        details.push("Aligned with Risk-On");
      } else if (regime.regime === 'RISK_OFF' && isDefensive) {
        factors.macro = true;
        details.push("Aligned with Risk-Off");
      } else if (regime.regime === 'NEUTRAL') {
        factors.macro = true;
        details.push("Neutral Regime Safe");
      }
    } catch (e) {}

    // 2. TECHNICAL CHECK (Trend + RSI)
    try {
      const tech = await technicalIndicatorsService.getTechnicalIndicators(ticker);
      if (tech) {
        // Strict Bullish for Growth, Permissive for Safe
        if (tier === 'blue_chip') {
             // Safe stocks just need to NOT be bearish
             if (tech.overallSignal !== 'bearish') {
                 factors.technical = true;
                 details.push(`Technical Stable (RSI ${tech.rsi.toFixed(0)})`);
             }
        } else {
             // Growth stocks need Uptrend
             if (tech.rsi < 70 && tech.overallSignal === 'bullish') {
                 factors.technical = true;
                 details.push(`Technical Bullish (RSI ${tech.rsi.toFixed(0)})`);
             }
        }
      }
    } catch (e) {}

    // 3. SENTIMENT CHECK
    try {
      const velocity = await socialSentimentService.getSentimentVelocity(ticker);
      const threshold = tier === 'blue_chip' ? 2 : 10; // Lower threshold for boring stocks
      if (velocity > threshold) {
        factors.sentiment = true;
        details.push(`Sentiment +${velocity.toFixed(0)}%`);
      }
    } catch (e) {}

    // SCORING
    let score = 0;
    if (factors.macro) score++;
    if (factors.insider) score++;
    if (factors.technical) score++;
    if (factors.sentiment) score++;
    
    // DYNAMIC THRESHOLD
    // Safe stocks (Blue Chip) pass with Score >= 1 (e.g. just Macro alignment is enough)
    // Growth/Crypto stocks need Score >= 2 (Must have Macro + Tech/Sentiment)
    const requiredScore = tier === 'blue_chip' ? 1 : 2;
    const passed = score >= requiredScore;

    return { ticker, score, passed, factors, details };
  }
}

export default new ConsensusEngine();
