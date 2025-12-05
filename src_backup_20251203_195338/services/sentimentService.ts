import newsProvider from './providers/newsProvider.js';
import govProvider from './providers/govProvider.js';
import tickerUniverseService from './tickerUniverseService.js';

export interface TickerSentimentSummary {
  ticker: string;
  score: number;
  mentions: number;
  positive: number;
  negative: number;
  neutral: number;
  latestHeadlines: { title: string; source: string; pubDate?: string }[];
  sources: { yahoo: number; marketWatch: number; reddit: number; houseTrades: number };
}

const POS_KEYWORDS = ['beat', 'record', 'upgrade', 'bullish', 'strong', 'growth', 'outperform', 'surge'];
const NEG_KEYWORDS = ['miss', 'downgrade', 'fraud', 'investigation', 'lawsuit', 'bankruptcy', 'warning', 'plunge', 'bearish'];

class SentimentService {
  
  private getScore(text: string): number {
    const lower = text.toLowerCase();
    let score = 0;
    
    for (const w of POS_KEYWORDS) {
      if (lower.includes(w)) score++;
    }
    for (const w of NEG_KEYWORDS) {
      if (lower.includes(w)) score--;
    }
    return score;
  }

  private initSummary(ticker: string): TickerSentimentSummary {
    return {
      ticker,
      score: 0,
      mentions: 0,
      positive: 0,
      negative: 0,
      neutral: 0,
      latestHeadlines: [],
      sources: { yahoo: 0, marketWatch: 0, reddit: 0, houseTrades: 0 }
    };
  }

  async buildTickerSentimentSnapshot(tickers: string[]): Promise<TickerSentimentSummary[]> {
    // 1. Fetch Data
    const [yahoo, mw, reddit, house] = await Promise.all([
      newsProvider.getYahooNews(),
      newsProvider.getMarketWatchNews(),
      newsProvider.getRedditNews(),
      govProvider.getHouseTradingData()
    ]);

    const map = new Map<string, TickerSentimentSummary>();
    
    // Initialize map
    tickers.forEach(t => map.set(t, this.initSummary(t)));

    // Helper to process text items
    const processItem = (text: string, sourceKey: keyof TickerSentimentSummary['sources'], title: string, pubDate?: string) => {
      tickers.forEach(ticker => {
        // Whole word match
        const regex = new RegExp(`\\b${ticker}\\b`, 'i');
        if (regex.test(text)) {
          const entry = map.get(ticker)!;
          const score = this.getScore(text);
          
          entry.mentions++;
          entry.score += score;
          
          if (score > 0) entry.positive++;
          else if (score < 0) entry.negative++;
          else entry.neutral++;
          
          entry.sources[sourceKey]++;
          
          // Keep last 5 headlines
          if (entry.latestHeadlines.length < 5) {
            entry.latestHeadlines.push({ title, source: sourceKey, pubDate });
          }
        }
      });
    };

    // 2. Process Yahoo
    yahoo.forEach(i => processItem(`${i.title} ${i.link}`, 'yahoo', i.title, i.pubDate));

    // 3. Process MarketWatch
    mw.forEach(i => processItem(`${i.title} ${i.link}`, 'marketWatch', i.title, i.pubDate));

    // 4. Process Reddit
    reddit.forEach(i => processItem(`${i.title} ${i.link}`, 'reddit', i.title, i.pubDate));

    // 5. Process House Trades
    house.forEach((t: any) => {
      // t has ticker, asset_description, type, amount
      const text = `${t.ticker} ${t.asset_description} ${t.type}`;
      // Explicit ticker match from object is safer, but we stick to text search logic to be consistent
      // or direct match if ticker field exists
      if (t.ticker && tickers.includes(t.ticker)) {
         const entry = map.get(t.ticker)!;
         // Simple heuristic: purchase ~ bullish keyword logic? 
         // Prompt strict rules: "Keyword based scoring ONLY".
         // We check 'text' against keywords. 'purchase' is not a keyword, but maybe 'strong'?
         // If no keywords match, it remains neutral unless we add to keywords list.
         // However, we must follow the prompt's explicit keyword list.
         const score = this.getScore(text);
         
         entry.mentions++;
         entry.score += score;
         if (score > 0) entry.positive++;
         else if (score < 0) entry.negative++;
         else entry.neutral++;

         entry.sources.houseTrades++;
         if (entry.latestHeadlines.length < 5) {
             entry.latestHeadlines.push({ 
                 title: `House Trade: ${t.representative} (${t.type})`, 
                 source: 'houseTrades',
                 pubDate: t.transaction_date 
             });
         }
      }
    });

    return Array.from(map.values());
  }

  async getTopSentimentMovers(limit: number): Promise<TickerSentimentSummary[]> {
    let universe: string[] = [];
    try {
      universe = await tickerUniverseService.getUniverse();
    } catch (e) {
      console.warn('Failed to fetch universe, using fallback');
    }

    if (universe.length === 0) {
      universe = ['AAPL','MSFT','NVDA','TSLA','AMD','META','GOOGL','AMZN'];
    }

    // Limit universe scan to top 50 to avoid perf hit in this lightweight service
    const scanList = universe.slice(0, 50);
    
    const results = await this.buildTickerSentimentSnapshot(scanList);
    
    // Filter: Mentions >= 2
    const active = results.filter(r => r.mentions >= 2);
    
    // Sort by absolute score magnitude (High positive or High negative)
    active.sort((a, b) => Math.abs(b.score) - Math.abs(a.score));
    
    return active.slice(0, limit);
  }
}

export default new SentimentService();
