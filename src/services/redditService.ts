// backend/src/services/redditService.ts
// Reddit API Integration for Social Sentiment Tracking
// Focus: r/WallStreetBets, r/stocks, r/investing
// Free API: https://www.reddit.com/dev/api

import axios from 'axios';

const REDDIT_USER_AGENT = 'MarketAI/1.0 (by /u/YourRedditUsername)';
const REDDIT_BASE_URL = 'https://oauth.reddit.com';
const REDDIT_AUTH_URL = 'https://www.reddit.com/api/v1/access_token';

// If you have Reddit API credentials (optional, rate limits are higher)
const REDDIT_CLIENT_ID = process.env.REDDIT_CLIENT_ID;
const REDDIT_CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET;

interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  author: string;
  subreddit: string;
  score: number;
  num_comments: number;
  upvote_ratio: number;
  created_utc: number;
  url: string;
  permalink: string;
  link_flair_text: string | null;
}

interface TickerMention {
  ticker: string;
  mentions: number;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  avgScore: number;
  posts: RedditPost[];
}

class RedditService {
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  /**
   * Get OAuth access token (if credentials provided)
   */
  private async getAccessToken(): Promise<string | null> {
    // Check if we have valid token
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    // If no credentials, use public API (lower rate limits)
    if (!REDDIT_CLIENT_ID || !REDDIT_CLIENT_SECRET) {
      console.log('  ℹ️ No Reddit credentials - using public API (lower rate limits)');
      return null;
    }

    try {
      console.log('🔑 Getting Reddit OAuth token...');
      
      const response = await axios.post(
        REDDIT_AUTH_URL,
        'grant_type=client_credentials',
        {
          auth: {
            username: REDDIT_CLIENT_ID,
            password: REDDIT_CLIENT_SECRET
          },
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': REDDIT_USER_AGENT
          }
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000; // Refresh 1 min early

      console.log('  ✓ OAuth token obtained');
      return this.accessToken;
      
    } catch (error: any) {
      console.error('  ✗ OAuth failed:', error.message);
      return null;
    }
  }

  /**
   * Get hot posts from WallStreetBets
   */
  async getWallStreetBetsHot(limit: number = 50): Promise<RedditPost[]> {
    console.log('📊 Fetching r/WallStreetBets hot posts...');
    return await this.getSubredditPosts('wallstreetbets', 'hot', limit);
  }

  /**
   * Get new posts from WallStreetBets
   */
  async getWallStreetBetsNew(limit: number = 50): Promise<RedditPost[]> {
    console.log('📊 Fetching r/WallStreetBets new posts...');
    return await this.getSubredditPosts('wallstreetbets', 'new', limit);
  }

  /**
   * Get posts from r/stocks
   */
  async getStocksPosts(limit: number = 50): Promise<RedditPost[]> {
    console.log('📊 Fetching r/stocks posts...');
    return await this.getSubredditPosts('stocks', 'hot', limit);
  }

  /**
   * Get posts from r/investing
   */
  async getInvestingPosts(limit: number = 50): Promise<RedditPost[]> {
    console.log('📊 Fetching r/investing posts...');
    return await this.getSubredditPosts('investing', 'hot', limit);
  }

  /**
   * Get posts from any subreddit
   */
  async getSubredditPosts(
    subreddit: string,
    sort: 'hot' | 'new' | 'top' | 'rising' = 'hot',
    limit: number = 50
  ): Promise<RedditPost[]> {
    try {
      const token = await this.getAccessToken();
      
      const url = token 
        ? `${REDDIT_BASE_URL}/r/${subreddit}/${sort}`
        : `https://www.reddit.com/r/${subreddit}/${sort}.json`;

      const headers: any = {
        'User-Agent': REDDIT_USER_AGENT
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await axios.get(url, {
        params: { limit },
        headers,
        timeout: 10000
      });

      const posts = response.data.data.children.map((child: any) => this.mapPost(child.data));
      
      console.log(`  ✓ Found ${posts.length} posts from r/${subreddit}`);
      return posts;
      
    } catch (error: any) {
      console.error(`  ✗ Error fetching r/${subreddit}:`, error.message);
      return [];
    }
  }

  /**
   * Extract ticker mentions from posts
   */
  extractTickerMentions(posts: RedditPost[]): TickerMention[] {
    console.log(`🔍 Extracting ticker mentions from ${posts.length} posts...`);
    
    const tickerMap = new Map<string, {
      mentions: number;
      totalScore: number;
      posts: RedditPost[];
      bullishCount: number;
      bearishCount: number;
    }>();

    // Stock ticker pattern (3-5 uppercase letters to avoid 2-letter words)
    const tickerRegex = /\b([A-Z]{3,5})\b/g;
    
    // COMPREHENSIVE exclusion list (300+ common words and abbreviations)
    const excludeWords = new Set([
      // Common 2-letter words (shouldn't match anyway with 3+ regex, but just in case)
      'TO', 'OF', 'IN', 'ON', 'IS', 'IT', 'AT', 'AS', 'BE', 'BY', 'DO', 'GO', 'HE', 'IF',
      'ME', 'MY', 'NO', 'OR', 'SO', 'UP', 'US', 'WE', 'AN', 'AM',
      
      // Common 3-letter words
      'THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'CAN', 'HER', 'WAS', 'ONE',
      'OUR', 'OUT', 'DAY', 'GET', 'HAS', 'HIM', 'HIS', 'HOW', 'ITS', 'MAY', 'NEW', 'NOW',
      'OLD', 'SEE', 'TWO', 'WAY', 'WHO', 'BOY', 'DID', 'LET', 'PUT', 'SAY', 'SHE', 'TOO',
      'USE', 'HAS', 'HAD', 'HOT', 'LOT', 'RUN', 'TOP', 'WON', 'YES', 'YET', 'BIG', 'BIT',
      'BOX', 'CAR', 'CUT', 'FEW', 'GOD', 'GUY', 'JOB', 'LAW', 'LAY', 'LEG', 'LIE', 'LOW',
      'MAN', 'OWN', 'PAY', 'RED', 'SAT', 'SET', 'SIT', 'SIX', 'TEN', 'TRY', 'WAR', 'WIN',
      'BAD', 'BAG', 'BAR', 'BED', 'BET', 'BOY', 'BUS', 'BUY', 'CAT', 'COP', 'CUP', 'DOG',
      'DUE', 'EAR', 'EAT', 'END', 'EYE', 'FAR', 'FAT', 'FIT', 'FLY', 'FUN', 'GAP', 'GAS',
      'GUN', 'HAT', 'HIT', 'HOW', 'KEY', 'KID', 'LAB', 'LAD', 'LED', 'LEG', 'MAP', 'MIX',
      'MOM', 'NOT', 'ODD', 'OFF', 'OIL', 'PER', 'PET', 'POP', 'RAW', 'ROW', 'SAD', 'SAW',
      'SEA', 'SEX', 'SKY', 'SON', 'SUM', 'SUN', 'TAX', 'TEA', 'TIE', 'TIP', 'TON', 'TOY',
      'VIA', 'WAY', 'WHY', 'WIN', 'WOW', 'ARM', 'ART', 'ASK', 'BAD', 'BAT', 'BIT', 'BOT',
      
      // Common 4-letter words
      'THAT', 'WITH', 'HAVE', 'THIS', 'WILL', 'YOUR', 'FROM', 'THEY', 'BEEN', 'HAVE',
      'WERE', 'SAID', 'EACH', 'THEM', 'LIKE', 'WHAT', 'WHEN', 'MAKE', 'THAN', 'MANY',
      'SOME', 'TIME', 'VERY', 'WELL', 'ONLY', 'COME', 'MADE', 'FIND', 'HERE', 'OVER',
      'SUCH', 'TAKE', 'INTO', 'YEAR', 'GOOD', 'JUST', 'EVEN', 'MUCH', 'MOST', 'BACK',
      'WORK', 'CALL', 'WANT', 'NEED', 'FEEL', 'HIGH', 'KEEP', 'LAST', 'WEEK', 'GIVE',
      'TOLD', 'DOES', 'WENT', 'LONG', 'AWAY', 'SHOW', 'CAME', 'BOTH', 'KNEW', 'CASE',
      'SAME', 'USED', 'LOOK', 'ALSO', 'MORE', 'BEEN', 'HAND', 'LIFE', 'TURN', 'HEAD',
      'ROOM', 'SIDE', 'TOOK', 'FACT', 'HELP', 'SURE', 'ONCE', 'AREA', 'FOUR', 'LEFT',
      'BEST', 'OPEN', 'KIND', 'NAME', 'EVER', 'KNOW', 'HOLD', 'MOVE', 'FACE', 'LATE',
      'SOON', 'MUST', 'CARE', 'LOST', 'THUS', 'ABLE', 'REAL', 'TRUE', 'UPON', 'NEXT',
      'FREE', 'LESS', 'PAST', 'HALF', 'LINE', 'FULL', 'MAIN', 'BODY', 'FELT', 'MEAN',
      'LOVE', 'LIVE', 'BOOK', 'READ', 'TALK', 'DAYS', 'BODY', 'GIRL', 'CITY', 'PLAY',
      'HEAR', 'PART', 'SEEM', 'TELL', 'DONE', 'HOME', 'GETS', 'FIRE', 'FIVE', 'LOST',
      'FORM', 'CAME', 'DOOR', 'PAID', 'WALK', 'WENT', 'DOWN', 'ELSE', 'PLAN', 'HOPE',
      
      // Common 5-letter words
      'EVERY', 'ABOUT', 'COULD', 'THEIR', 'WOULD', 'THERE', 'THINK', 'WHICH', 'THESE',
      'AFTER', 'FIRST', 'BEING', 'WHERE', 'THOSE', 'NEVER', 'ANOTHER', 'THROUGH', 'WHILE',
      'OTHER', 'UNDER', 'MIGHT', 'STILL', 'THREE', 'WORLD', 'GOING', 'YEARS', 'PLACE',
      'RIGHT', 'GREAT', 'THING', 'HOUSE', 'FOUND', 'SEEMS', 'ASKED', 'GIVEN', 'TAKEN',
      'KNOWN', 'DOING', 'AGAIN', 'POINT', 'TODAY', 'MONEY', 'PRICE', 'USING', 'WORKS',
      'MAKES', 'START', 'LEAVE', 'SHALL', 'WHOLE', 'BEGAN', 'SINCE', 'OUGHT', 'TRIED',
      'LIVED', 'WOMEN', 'TIMES', 'EIGHT', 'QUITE', 'SMALL', 'COMES', 'STATE', 'HUMAN',
      'LATER', 'NIGHT', 'EARLY', 'AMONG', 'CAUSE', 'ABOVE', 'WATCH', 'ALONG', 'WATER',
      'STOOD', 'HEARD', 'BASED', 'MAJOR', 'SHORT', 'CLOSE', 'MAYBE', 'REALLY', 'TAKEN',
      
      // Trading/Finance abbreviations (non-tickers)
      'CEO', 'CFO', 'CTO', 'SEC', 'IPO', 'ATH', 'ATL', 'IMO', 'TBH', 'YOY', 'QOQ', 'GDP',
      'CPI', 'FED', 'EOD', 'EOY', 'AH', 'PM', 'EST', 'PST', 'PDT', 'CST', 'MST',
      
      // Reddit/Internet slang
      'YOLO', 'DD', 'TLDR', 'TL;DR', 'EDIT', 'WSB', 'FOMO', 'BTW', 'IMO', 'IMHO', 
      'ELI5', 'OC', 'AMA', 'TIL', 'IANAL', 'IIRC', 'AFAIK', 'IDK', 'FYI', 'FAQ',
      'NSFW', 'RTFM', 'SMH', 'TBH', 'LMAO', 'ROFL', 'ASAP', 'FWIW', 'YMMV',
      
      // Common verbs/actions
      'HOLD', 'SELL', 'CALL', 'PUTS', 'LONG', 'RISK', 'GAIN', 'LOSS', 'MOON',
      'BEAR', 'BULL', 'DUMP', 'PUMP',
      
      // Financial/Trading terms (NOT tickers)
      'GAINS', 'CASH', 'DEBT', 'STOCK', 'BONDS', 'TIPS', 'CALLS', 'TRADE', 'FUNDS',
      'WORTH', 'VALUE', 'PRICE', 'RATE', 'DEAL', 'SOLD', 'EARN', 'BANK', 'ASSET',
      'BUYER', 'STAKE', 'HEDGE', 'INDEX', 'RATIO', 'COSTS', 'FEES', 'FLOW', 'OFFER',
      'CYCLE', 'HEAVY', 'POWER', 'LOWER', 'DAILY', 'CHECK', 'UNTIL', 'MONTH', 'MEANS',
      'DROP', 'CLICK', 'LINKS', 'SORT', 'TAKES', 'LEARN', 'STAY', 'SEND', 'FEELS',
      'SEEN', 'RISKS', 'LEVEL', 'DEALS', 'GUESS', 'AWARE', 'OFTEN', 'TITLE', 'MIND',
      'SHIFT', 'CORE', 'WEEKS', 'USERS', 'QUOTE', 'DIPS', 'BASIC', 'STORY', 'STUFF',
      'SHOWS', 'COST', 'SELF', 'ISSUE', 'FALL', 'LIGHT', 'PULL', 'WORST', 'WEAK',
      'NEAT', 'BOOKS', 'USER', 'THROW', 'IDEA', 'SAFE',
      
      // Trading action words
      'GROW', 'PLANS', 'TRACK', 'TOOLS', 'CRAZY', 'HAPPY', 'WALL', 'DIP', 'JOBS',
      'OWNS', 'BOOM', 'ETFS', 'AREN', 'GIANT', 'NAMES', 'HELD', 'SPACE', 'TWICE',
      'SHARE', 'NEWS', 'TERM', 'MOVES', 'SMART', 'GOES', 'FULLY', 'HUGE', 'WIFE',
      'TREND', 'TAXES', 'THIRD', 'FOCUS', 'SAVE', 'LIST', 'POST', 'WRONG', 'VIEW',
      'MEDIA', 'AUTO', 'POSTS', 'PORN',
      
      // Generic descriptors
      'DATA', 'TECH', 'LOOKS', 'GUYS', 'TOTAL', 'CAP', 'NET', 'ANY', 'EASY', 'SALES',
      'BEST', 'HEY', 'STOP', 'THEN', 'GOT', 'SAYS', 'WIKI', 'CHINA', 'UNTIL',
      
      // Web/Tech terms
      'HTTPS', 'HTML', 'WWW', 'COM', 'ORG', 'GOV', 'PNG', 'WEBP', 'ASHX', 'REDD',
      'WIDTH', 'AMP', 'ETC', 'DON', 'ISN',
      
      // Company names (words, not tickers)
      'APPLE', 'YAHOO', 'WENDY', 'BURRY',
      
      // More financial terms
      'CAPEX', 'EPS', 'CNBC', 'AGO', 'ADD',
      
      // Contractions (Reddit common)
      'DOESN', 'HAVEN', 'HASN', 'DIDN', 'COULDN', 'WOULDN', 'SHOULDN', 'WASN', 'WEREN',
      
      // Months/Days
      'JAN', 'FEB', 'MAR', 'APR', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
      'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'
    ]);

    for (const post of posts) {
      const text = `${post.title} ${post.selftext}`.toUpperCase();
      const matches = text.matchAll(tickerRegex);

      const uniqueTickers = new Set<string>();
      for (const match of matches) {
        const ticker = match[1];
        // Only accept 3-5 character tickers that aren't common words
        if (!excludeWords.has(ticker) && ticker.length >= 3 && ticker.length <= 5) {
          uniqueTickers.add(ticker);
        }
      }

      // Determine sentiment from post
      const sentiment = this.analyzeSentiment(post);
      
      for (const ticker of uniqueTickers) {
        if (!tickerMap.has(ticker)) {
          tickerMap.set(ticker, {
            mentions: 0,
            totalScore: 0,
            posts: [],
            bullishCount: 0,
            bearishCount: 0
          });
        }

        const data = tickerMap.get(ticker)!;
        data.mentions++;
        data.totalScore += post.score;
        data.posts.push(post);

        if (sentiment === 'bullish') data.bullishCount++;
        if (sentiment === 'bearish') data.bearishCount++;
      }
    }

    // Convert to array and calculate aggregate sentiment
    const mentions: TickerMention[] = [];
    
    for (const [ticker, data] of tickerMap.entries()) {
      if (data.mentions >= 5) { // At least 5 mentions to be considered (heavily reduces false positives)
        let sentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
        
        if (data.bullishCount > data.bearishCount * 1.5) {
          sentiment = 'bullish';
        } else if (data.bearishCount > data.bullishCount * 1.5) {
          sentiment = 'bearish';
        }

        mentions.push({
          ticker,
          mentions: data.mentions,
          sentiment,
          avgScore: Math.round(data.totalScore / data.mentions),
          posts: data.posts.slice(0, 5) // Top 5 posts
        });
      }
    }

    // Sort by mentions (trending)
    mentions.sort((a, b) => b.mentions - a.mentions);

    console.log(`  ✓ Extracted ${mentions.length} unique tickers`);
    return mentions;
  }

  /**
   * Analyze sentiment of a post
   */
  private analyzeSentiment(post: RedditPost): 'bullish' | 'bearish' | 'neutral' {
    const text = `${post.title} ${post.selftext}`.toLowerCase();

    // Bullish indicators
    const bullishWords = [
      'buy', 'calls', 'moon', 'rocket', 'bullish', 'long', 'undervalued', 'yolo',
      'gains', 'profit', 'tendies', 'stonks', 'rally', 'breakout', 'pump'
    ];

    // Bearish indicators
    const bearishWords = [
      'sell', 'puts', 'short', 'bearish', 'crash', 'dump', 'overvalued', 'loss',
      'red', 'tank', 'plunge', 'decline', 'drop', 'fall', 'bubble'
    ];

    let bullishScore = 0;
    let bearishScore = 0;

    for (const word of bullishWords) {
      const count = (text.match(new RegExp(word, 'g')) || []).length;
      bullishScore += count;
    }

    for (const word of bearishWords) {
      const count = (text.match(new RegExp(word, 'g')) || []).length;
      bearishScore += count;
    }

    // Consider upvote ratio
    if (post.upvote_ratio >= 0.8) {
      bullishScore += 1;
    } else if (post.upvote_ratio <= 0.5) {
      bearishScore += 1;
    }

    // Flairs
    if (post.link_flair_text) {
      const flair = post.link_flair_text.toLowerCase();
      if (flair.includes('gain') || flair.includes('dd')) bullishScore += 2;
      if (flair.includes('loss')) bearishScore += 2;
    }

    if (bullishScore > bearishScore * 1.5) return 'bullish';
    if (bearishScore > bullishScore * 1.5) return 'bearish';
    return 'neutral';
  }

  /**
   * Get comprehensive social sentiment (all subreddits)
   */
  async getComprehensiveSentiment(): Promise<{
    trending: TickerMention[];
    wsb: RedditPost[];
    stocks: RedditPost[];
    investing: RedditPost[];
    timestamp: Date;
  }> {
    console.log('\n🎯 Gathering comprehensive Reddit sentiment...\n');
    
    const [wsb, stocks, investing] = await Promise.all([
      this.getWallStreetBetsHot(50),
      this.getStocksPosts(30),
      this.getInvestingPosts(30)
    ]);

    // Combine and extract trending
    const allPosts = [...wsb, ...stocks, ...investing];
    const trending = this.extractTickerMentions(allPosts);

    console.log(`\n✅ Sentiment gathered: ${trending.length} trending tickers\n`);

    return {
      trending,
      wsb,
      stocks,
      investing,
      timestamp: new Date()
    };
  }

  /**
   * Search for specific ticker mentions
   */
  async searchTicker(ticker: string, limit: number = 25): Promise<RedditPost[]> {
    console.log(`🔍 Searching Reddit for ${ticker}...`);
    
    try {
      const token = await this.getAccessToken();
      
      const url = token
        ? `${REDDIT_BASE_URL}/search`
        : `https://www.reddit.com/search.json`;

      const headers: any = {
        'User-Agent': REDDIT_USER_AGENT
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await axios.get(url, {
        params: {
          q: `${ticker} OR $${ticker}`,
          restrict_sr: false,
          sort: 'relevance',
          limit,
          t: 'week' // Past week
        },
        headers,
        timeout: 10000
      });

      const posts = response.data.data.children
        .map((child: any) => this.mapPost(child.data))
        .filter((post: RedditPost) => 
          // Filter to stock-related subreddits
          ['wallstreetbets', 'stocks', 'investing', 'stockmarket', 'options'].includes(post.subreddit.toLowerCase())
        );

      console.log(`  ✓ Found ${posts.length} posts mentioning ${ticker}`);
      return posts;
      
    } catch (error: any) {
      console.error(`  ✗ Search error:`, error.message);
      return [];
    }
  }

  /**
   * Map Reddit API response to our format
   */
  private mapPost(data: any): RedditPost {
    return {
      id: data.id,
      title: data.title,
      selftext: data.selftext || '',
      author: data.author,
      subreddit: data.subreddit,
      score: data.score,
      num_comments: data.num_comments,
      upvote_ratio: data.upvote_ratio,
      created_utc: data.created_utc,
      url: data.url,
      permalink: `https://reddit.com${data.permalink}`,
      link_flair_text: data.link_flair_text
    };
  }

  /**
   * Check API health
   */
  async checkHealth(): Promise<boolean> {
    try {
      const posts = await this.getWallStreetBetsHot(5);
      return posts.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get usage info
   */
  getUsageInfo(): string {
    const hasCredentials = !!(REDDIT_CLIENT_ID && REDDIT_CLIENT_SECRET);
    
    return `
Reddit API:
- Authentication: ${hasCredentials ? 'OAuth (high limits)' : 'Public (60 req/min)'}
- Subreddits: WallStreetBets, stocks, investing
- Sentiment analysis: Built-in
- Ticker extraction: Automated
- Cost: FREE

${!hasCredentials ? '\nℹ️  Add REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET for higher rate limits' : ''}
    `.trim();
  }
}

export default new RedditService();
