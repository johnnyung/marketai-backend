// backend/src/services/newsAggregatorService.ts
// RSS News Feed Aggregation - Free & Unlimited

import axios from 'axios';
import xml2js from 'xml2js';

interface NewsItem {
  title: string;
  description: string;
  link: string;
  pubDate: Date;
  source: string;
  category?: string;
}

class NewsAggregatorService {
  private parser = new xml2js.Parser();

  private RSS_FEEDS = [
    // === US FINANCIAL NEWS (Original 6) ===
    { url: 'https://www.reutersagency.com/feed/?taxonomy=best-topics&post_type=best', name: 'Reuters Business', category: 'news' },
    { url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html', name: 'CNBC Breaking News', category: 'news' },
    { url: 'https://feeds.marketwatch.com/marketwatch/topstories/', name: 'MarketWatch Top Stories', category: 'news' },
    { url: 'https://finance.yahoo.com/news/rssindex', name: 'Yahoo Finance', category: 'news' },
    { url: 'https://seekingalpha.com/feed.xml', name: 'Seeking Alpha', category: 'news' },
    { url: 'https://www.benzinga.com/feed', name: 'Benzinga', category: 'news' },
    
    // === GLOBAL NEWS (7 new) ===
    { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', name: 'BBC World News', category: 'global' },
    { url: 'https://www.aljazeera.com/xml/rss/all.xml', name: 'Al Jazeera', category: 'global' },
    { url: 'https://rss.dw.com/xml/rss-en-all', name: 'Deutsche Welle', category: 'global' },
    { url: 'https://www.france24.com/en/rss', name: 'France 24', category: 'global' },
    { url: 'https://www.scmp.com/rss/91/feed', name: 'South China Morning Post', category: 'global' },
    { url: 'https://asia.nikkei.com/rss/feed/nar', name: 'Nikkei Asia', category: 'global' },
    { url: 'https://www.economist.com/business/rss.xml', name: 'The Economist Business', category: 'global' },
    
    // === US BUSINESS NEWS (5 new) ===
    { url: 'https://www.ft.com/?format=rss', name: 'Financial Times', category: 'business' },
    { url: 'https://www.wsj.com/xml/rss/3_7085.xml', name: 'Wall Street Journal Markets', category: 'business' },
    { url: 'https://www.forbes.com/business/feed/', name: 'Forbes Business', category: 'business' },
    { url: 'https://feeds.businessinsider.com/custom/all', name: 'Business Insider', category: 'business' },
    { url: 'https://www.thestreet.com/feeds/stocks.xml', name: 'TheStreet', category: 'business' },
    
    // === TECH NEWS (5 new) ===
    { url: 'https://techcrunch.com/feed/', name: 'TechCrunch', category: 'tech' },
    { url: 'https://www.theverge.com/rss/index.xml', name: 'The Verge', category: 'tech' },
    { url: 'http://feeds.arstechnica.com/arstechnica/technology-lab', name: 'Ars Technica', category: 'tech' },
    { url: 'https://feeds.feedburner.com/venturebeat/SZYF', name: 'VentureBeat', category: 'tech' },
    { url: 'https://www.wired.com/feed/rss', name: 'Wired', category: 'tech' },
    
    // === CRYPTO NEWS (4 new) ===
    { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', name: 'CoinDesk', category: 'crypto' },
    { url: 'https://cointelegraph.com/rss', name: 'Cointelegraph', category: 'crypto' },
    { url: 'https://www.theblock.co/rss.xml', name: 'The Block', category: 'crypto' },
    { url: 'https://decrypt.co/feed', name: 'Decrypt', category: 'crypto' },
    
    // === ADDITIONAL QUALITY SOURCES (3 new) ===
    { url: 'https://www.fool.com/feeds/index.aspx', name: 'Motley Fool', category: 'investing' },
    { url: 'https://www.investing.com/rss/news.rss', name: 'Investing.com', category: 'investing' },
    { url: 'https://www.barrons.com/articles/rss', name: 'Barrons', category: 'investing' },
  ];

  /**
   * Fetch news from all RSS feeds
   */
  async getAllNews(): Promise<NewsItem[]> {
    console.log('📰 Fetching news from RSS feeds...');
    
    const allNews: NewsItem[] = [];
    
    for (const feed of this.RSS_FEEDS) {
      try {
        const news = await this.fetchFeed(feed.url, feed.name, feed.category);
        allNews.push(...news);
        console.log(`  ✓ ${feed.name}: ${news.length} articles`);
      } catch (error) {
        console.error(`  ✗ ${feed.name} failed:`, error instanceof Error ? error.message : 'Unknown error');
      }
    }
    
    // Remove duplicates based on title
    const uniqueNews = this.deduplicateNews(allNews);
    
    console.log(`✅ Total unique news articles: ${uniqueNews.length}`);
    return uniqueNews;
  }

  /**
   * Fetch a single RSS feed
   */
  private async fetchFeed(url: string, source: string, category?: string): Promise<NewsItem[]> {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'MarketAI/1.0'
        }
      });

      const result = await this.parser.parseStringPromise(response.data);
      
      // Handle different RSS formats
      const items = result.rss?.channel?.[0]?.item || 
                   result.feed?.entry || 
                   [];

      return items.map((item: any) => ({
        title: this.extractText(item.title),
        description: this.extractText(item.description || item.summary || item.content),
        link: this.extractText(item.link || item.id),
        pubDate: new Date(this.extractText(item.pubDate || item.published || item.updated)),
        source,
        category: category || 'news'
      })).filter((item: NewsItem) => 
        item.title && 
        item.link && 
        !isNaN(item.pubDate.getTime())
      );

    } catch (error) {
      throw new Error(`Failed to fetch ${source}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract text from RSS field (handles arrays and objects)
   */
  private extractText(field: any): string {
    if (!field) return '';
    if (typeof field === 'string') return field;
    if (Array.isArray(field)) return field[0] || '';
    if (typeof field === 'object') {
      // Handle <link href="..."> format
      if (field.$ && field.$.href) return field.$.href;
      // Handle CDATA or _
      if (field._) return field._;
      return field.toString();
    }
    return '';
  }

  /**
   * Remove duplicate news articles
   */
  private deduplicateNews(news: NewsItem[]): NewsItem[] {
    const seen = new Set<string>();
    return news.filter(item => {
      if (!item.title || typeof item.title !== 'string') return false;

      const key = item.title.toLowerCase().substring(0, 50);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Get news from last N hours
   */
  async getRecentNews(hours: number = 24): Promise<NewsItem[]> {
    const allNews = await this.getAllNews();
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    return allNews.filter(item => item.pubDate >= cutoff)
                  .sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());
  }

  /**
   * Search news for specific keywords
   */
  async searchNews(keywords: string[]): Promise<NewsItem[]> {
    const allNews = await this.getAllNews();
    
    return allNews.filter(item => {
      const text = `${item.title} ${item.description}`.toLowerCase();
      return keywords.some(keyword => text.includes(keyword.toLowerCase()));
    });
  }

  /**
   * Extract tickers mentioned in news
   */
  extractTickers(text: string): string[] {
    // Common ticker patterns
    const tickerPatterns = [
      /\b([A-Z]{1,5})\b(?=\s+(?:stock|shares|traded|rallied|fell|rose|dropped|gained|lost))/gi,
      /\$([A-Z]{1,5})\b/g,
      /\(([A-Z]{1,5})\)/g,
    ];

    const tickers = new Set<string>();
    
    for (const pattern of tickerPatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const ticker = match[1];
        // Filter out common false positives
        if (ticker && 
            ticker.length >= 1 && 
            ticker.length <= 5 &&
            !['THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'ALL', 'CAN', 'HER', 'WAS', 'ONE', 'OUR', 'OUT', 'DAY', 'GET', 'HAS', 'HIM', 'HIS', 'HOW', 'MAN', 'NEW', 'NOW', 'OLD', 'SEE', 'TWO', 'WAY', 'WHO', 'BOY', 'ITS', 'LET', 'PUT', 'SAY', 'SHE', 'TOO', 'USE'].includes(ticker)) {
          tickers.add(ticker);
        }
      }
    }

    return Array.from(tickers);
  }

  /**
   * Calculate relevance score for news item
   */
  calculateRelevance(item: NewsItem): number {
    let score = 40; // Base score for news

    const text = `${item.title} ${item.description}`.toLowerCase();
    
    // === CRITICAL KEYWORDS (Market Moving) ===
    const criticalKeywords = [
      'earnings beat', 'earnings miss', 'acquisition', 'merger', 'buyout', 
      'bankruptcy', 'default', 'sec investigation', 'lawsuit settlement',
      'fda approval', 'breakthrough', 'layoffs', 'shutdown', 'recall'
    ];
    
    // === HIGH-VALUE KEYWORDS ===
    const highValueKeywords = [
      'earnings', 'merger', 'acquisition', 'ipo', 'dividend', 'split',
      'sec', 'investigation', 'lawsuit', 'settlement', 'bankruptcy',
      'approval', 'fda', 'deal', 'contract', 'guidance', 'outlook',
      'revenue', 'profit', 'loss', 'debt', 'restructuring'
    ];

    // === MARKET MOVERS ===
    const marketMovers = [
      'surges', 'soars', 'rallies', 'jumps', 'skyrockets',
      'plunges', 'crashes', 'tumbles', 'tanks', 'collapses'
    ];
    
    // === GEOPOLITICAL KEYWORDS ===
    const geopoliticalKeywords = [
      'war', 'conflict', 'sanctions', 'treaty', 'trade war', 'tariff',
      'election', 'coup', 'crisis', 'invasion', 'peace deal'
    ];
    
    // === CRYPTO KEYWORDS ===
    const cryptoKeywords = [
      'bitcoin', 'ethereum', 'crypto', 'blockchain', 'defi', 'nft',
      'sec approval', 'etf', 'halving', 'hard fork'
    ];
    
    // === TECH KEYWORDS ===
    const techKeywords = [
      'ai', 'artificial intelligence', 'machine learning', 'chatgpt',
      'quantum', 'semiconductor', 'chip', 'breakthrough', '5g', '6g'
    ];

    // Check critical keywords (+20 each)
    for (const keyword of criticalKeywords) {
      if (text.includes(keyword)) score += 20;
    }

    // Check high-value keywords (+10 each)
    for (const keyword of highValueKeywords) {
      if (text.includes(keyword)) score += 10;
    }

    // Check market movers (+8 each)
    for (const mover of marketMovers) {
      if (text.includes(mover)) score += 8;
    }
    
    // Check geopolitical keywords (+12 each)
    for (const keyword of geopoliticalKeywords) {
      if (text.includes(keyword)) score += 12;
    }
    
    // Check crypto keywords (+8 each)
    for (const keyword of cryptoKeywords) {
      if (text.includes(keyword)) score += 8;
    }
    
    // Check tech keywords (+8 each)
    for (const keyword of techKeywords) {
      if (text.includes(keyword)) score += 8;
    }

    // === RECENCY BONUS ===
    const hoursOld = (Date.now() - item.pubDate.getTime()) / (1000 * 60 * 60);
    if (hoursOld < 1) score += 15;      // Last hour
    else if (hoursOld < 6) score += 10; // Last 6 hours
    else if (hoursOld < 24) score += 5; // Last 24 hours

    // === TICKER MENTION BONUS ===
    const tickers = this.extractTickers(item.title);
    if (tickers.length > 0) score += 10;
    if (tickers.length > 2) score += 5; // Multiple tickers

    // === CATEGORY BONUSES ===
    if (item.category === 'global') score += 5;
    if (item.category === 'crypto') score += 5;
    if (item.category === 'tech') score += 5;

    return Math.min(100, score);
  }
}

export default new NewsAggregatorService();

// Add at the top of the file (after imports)
const COMPANY_TO_TICKER_MAP: Record<string, string> = {
  'pony ai': 'PONY',
  'pony.ai': 'PONY',
  'palantir': 'PLTR',
  'nvidia': 'NVDA',
  'microsoft': 'MSFT',
  'apple': 'AAPL',
  'google': 'GOOGL',
  'alphabet': 'GOOGL',
  'meta': 'META',
  'facebook': 'META',
  'amazon': 'AMZN',
  'tesla': 'TSLA',
  'coinbase': 'COIN',
  'robinhood': 'HOOD',
  'block': 'SQ',
  'square': 'SQ',
  'shopify': 'SHOP',
  'roku': 'ROKU',
  'zoom': 'ZM',
  'roblox': 'RBLX',
  'draftkings': 'DKNG',
  'twilio': 'TWLO',
  'spotify': 'SPOT',
};
