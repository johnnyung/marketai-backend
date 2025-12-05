import socialSentimentService from './socialSentimentService.js';
import institutionalFlowService from './institutionalFlowService.js';
import fmpService from './fmpService.js';

interface ContrarianSignal {
  ticker: string;
  sentiment: string; // 'Extreme Fear' or 'Extreme Greed'
  whale_action: string; // 'Buying' or 'Selling'
  confidence: number;
  reason: string;
}

// High-Beta & Crypto-Proxies usually have the best contrarian signals
const WATCHLIST = ['BTC', 'ETH', 'COIN', 'MSTR', 'TSLA', 'NVDA', 'AMD', 'MARA'];

class WhaleContrarianService {

  async scanForDivergence(): Promise<ContrarianSignal[]> {
    console.log('      🐋 Whale Radar: Scanning for Sentiment/Flow Divergence...');
    
    const signals: ContrarianSignal[] = [];

    for (const ticker of WATCHLIST) {
        try {
            // 1. Get Retail Sentiment (The Crowd)
            const sentiment = await socialSentimentService.getSentimentVelocity(ticker);
            
            // 2. Get Institutional Flow (The Whales)
            const flow = await institutionalFlowService.checkAccumulation(ticker);
            
            // 3. Check for Divergence
            
            // CASE A: CROWD PANIC (Sentiment Crash) + WHALE ACCUMULATION
            if (sentiment < -10 && flow && flow.type === 'ACCUMULATION') {
                signals.push({
                    ticker,
                    sentiment: 'Extreme Fear',
                    whale_action: 'Buying',
                    confidence: 90,
                    reason: `CONTRARIAN BUY: Retail sentiment collapsing (-${Math.abs(sentiment).toFixed(0)}%) but Whales are accumulating (${flow.reason}).`
                });
                console.log(`      🚨 CONTRARIAN BUY DETECTED: ${ticker}`);
            }
            
            // CASE B: CROWD EUPHORIA (Sentiment Spike) + WHALE DUMP (Price Stalling)
            // We infer selling if price is flat/down despite massive hype
            if (sentiment > 30) {
                const quote = await fmpService.getPrice(ticker);
                if (quote && quote.changePercent < 0) {
                     signals.push({
                        ticker,
                        sentiment: 'Extreme Greed',
                        whale_action: 'Selling',
                        confidence: 85,
                        reason: `CONTRARIAN SELL: Extreme hype (+${sentiment.toFixed(0)}%) but price is red. Whales selling into strength.`
                    });
                }
            }
            
        } catch(e) {}
        
        await new Promise(r => setTimeout(r, 200));
    }

    return signals;
  }
}

export default new WhaleContrarianService();
