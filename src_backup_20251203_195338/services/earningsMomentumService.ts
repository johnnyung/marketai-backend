import finnhubService from './finnhubService.js';
import socialSentimentService from './socialSentimentService.js';

interface MomentumSignal {
    ticker: string;
    earningsDate: string;
    sentimentVelocity: number;
    confidence: number;
}

class EarningsMomentumService {

  async scanForMomentumPlays(): Promise<MomentumSignal[]> {
      console.log("   🚀 Scanning for Earnings Momentum...");
      const signals: MomentumSignal[] = [];

      try {
          // 1. Get Upcoming Earnings (Next 14 Days)
          const calendar = await finnhubService.getEarningsCalendar(14);
          
          // Take top 20 to save API calls and focus on relevance
          const upcoming = calendar.slice(0, 20);

          console.log(`      -> Analyzing ${upcoming.length} upcoming earnings events.`);

          for (const event of upcoming) {
              const ticker = event.symbol;
              if (!ticker) continue;

              // 2. Check Sentiment Velocity
              const velocity = await socialSentimentService.getSentimentVelocity(ticker);

              // 3. The "Pre-Earnings Hype" Criteria
              // Momentum > 20% increase in chatter AND Earnings within 2 weeks
              if (velocity > 20) {
                  console.log(`      🔥 HYPE DETECTED: ${ticker} (Velocity: +${velocity.toFixed(0)}%)`);
                  
                  signals.push({
                      ticker,
                      earningsDate: event.date,
                      sentimentVelocity: velocity,
                      confidence: Math.min(95, 75 + (velocity / 10)) // Cap confidence at 95
                  });
              }
          }
      } catch (e) {
          console.error("Earnings Momentum Error:", e);
      }
      
      return signals.sort((a, b) => b.sentimentVelocity - a.sentimentVelocity);
  }
}

export default new EarningsMomentumService();
