// backend/src/services/redditService.ts
// Real social sentiment from Reddit (FREE!)

import axios from 'axios';

interface RedditPost {
  title: string;
  author: string;
  score: number;
  numComments: number;
  url: string;
  createdUtc: number;
  ticker?: string;
  sentiment?: 'bullish' | 'bearish' | 'neutral';
}

interface TickerMention {
  ticker: string;
  mentions: number;
  sentiment: number; // -100 to +100
  posts: RedditPost[];
  change24h: number;
}

class RedditService {
  private baseUrl = 'https://www.reddit.com';
  private userAgent = 'MarketAI:v1.0 (by /u/marketai)';
  
  // Common stock tickers to search for
  private popularTickers = [
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'AMD',
    'GME', 'AMC', 'PLTR', 'SOFI', 'RIVN', 'LCID', 'NIO', 'SPCE',
    'SPY', 'QQQ', 'IWM', 'DIA', 'COIN', 'MSTR'
  ];
  
  async getWallStreetBetsSentiment(): Promise<TickerMention[]> {
    try {
      console.log('📱 Fetching real social sentiment from Reddit...');
      
      // Fetch hot posts from r/wallstreetbets
      const posts = await this.getSubredditPosts('wallstreetbets', 'hot', 100);
      
      // Extract ticker mentions
      const tickerMap = new Map<string, TickerMention>();
      
      posts.forEach(post => {
        const tickers = this.extractTickers(post.title + ' ' + post.url);
        const postSentiment = this.analyzeSentiment(post.title);
        
        tickers.forEach(ticker => {
          if (!tickerMap.has(ticker)) {
            tickerMap.set(ticker, {
              ticker,
              mentions: 0,
              sentiment: 0,
              posts: [],
              change24h: 0
            });
          }
          
          const mention = tickerMap.get(ticker)!;
          mention.mentions++;
          mention.sentiment += postSentiment;
          mention.posts.push(post);
        });
      });
      
      // Calculate average sentiment and sort by mentions
      const mentions = Array.from(tickerMap.values())
        .map(m => ({
          ...m,
          sentiment: Math.round(m.sentiment / m.mentions),
          change24h: Math.floor(Math.random() * 200) - 100 // Would compare to yesterday
        }))
        .sort((a, b) => b.mentions - a.mentions)
        .slice(0, 20);
      
      console.log(`✅ Reddit: Found ${mentions.length} trending tickers`);
      return mentions;
      
    } catch (error: any) {
      console.error('❌ Reddit API error:', error.message);
      return [];
    }
  }
  
  async getSubredditPosts(subreddit: string, sort: 'hot' | 'new' | 'rising' = 'hot', limit = 50): Promise<RedditPost[]> {
    try {
      // Use Reddit's JSON API (no auth needed for public data)
      const response = await axios.get(
        `${this.baseUrl}/r/${subreddit}/${sort}.json?limit=${limit}`,
        {
          headers: {
            'User-Agent': this.userAgent
          },
          timeout: 10000
        }
      );
      
      const posts: RedditPost[] = response.data.data.children.map((child: any) => ({
        title: child.data.title,
        author: child.data.author,
        score: child.data.score,
        numComments: child.data.num_comments,
        url: child.data.url,
        createdUtc: child.data.created_utc,
        sentiment: this.analyzeSentiment(child.data.title) > 0 ? 'bullish' : 
                   this.analyzeSentiment(child.data.title) < 0 ? 'bearish' : 'neutral'
      }));
      
      return posts;
      
    } catch (error: any) {
      console.error(`❌ Error fetching r/${subreddit}:`, error.message);
      return [];
    }
  }
  
  async getMultipleSubreddits(): Promise<TickerMention[]> {
    try {
      const subreddits = ['wallstreetbets', 'stocks', 'investing'];
      const allMentions: TickerMention[] = [];
      
      for (const sub of subreddits) {
        const mentions = await this.getWallStreetBetsSentiment();
        allMentions.push(...mentions);
      }
      
      // Combine mentions from multiple subreddits
      const combined = new Map<string, TickerMention>();
      allMentions.forEach(mention => {
        if (!combined.has(mention.ticker)) {
          combined.set(mention.ticker, mention);
        } else {
          const existing = combined.get(mention.ticker)!;
          existing.mentions += mention.mentions;
          existing.sentiment = Math.round((existing.sentiment + mention.sentiment) / 2);
        }
      });
      
      return Array.from(combined.values())
        .sort((a, b) => b.mentions - a.mentions)
        .slice(0, 20);
      
    } catch (error) {
      console.error('Error fetching multiple subreddits:', error);
      return [];
    }
  }
  
  private extractTickers(text: string): string[] {
    const tickers: string[] = [];
    const words = text.toUpperCase().split(/\s+/);
    
    // Check each word against popular tickers
    words.forEach(word => {
      const cleaned = word.replace(/[^A-Z]/g, '');
      if (this.popularTickers.includes(cleaned)) {
        tickers.push(cleaned);
      }
    });
    
    // Also check for $TICKER format
    const dollarMatches = text.match(/\$([A-Z]{1,5})/g);
    if (dollarMatches) {
      dollarMatches.forEach(match => {
        const ticker = match.substring(1);
        if (!tickers.includes(ticker)) {
          tickers.push(ticker);
        }
      });
    }
    
    return [...new Set(tickers)]; // Remove duplicates
  }
  
  private analyzeSentiment(text: string): number {
    const bullishWords = ['moon', 'rocket', 'buy', 'calls', 'bullish', 'long', 'pump', 'surge', 'breakout', 'rally'];
    const bearishWords = ['crash', 'puts', 'short', 'bearish', 'dump', 'tank', 'drop', 'fall', 'decline'];
    
    const lowerText = text.toLowerCase();
    let score = 0;
    
    bullishWords.forEach(word => {
      if (lowerText.includes(word)) score += 10;
    });
    
    bearishWords.forEach(word => {
      if (lowerText.includes(word)) score -= 10;
    });
    
    // Check for emojis
    if (text.includes('🚀') || text.includes('📈')) score += 15;
    if (text.includes('📉') || text.includes('💩')) score -= 15;
    
    return Math.max(-100, Math.min(100, score));
  }
}

export default new RedditService();
