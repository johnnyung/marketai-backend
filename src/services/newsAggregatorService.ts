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
    // Reuters - High quality business news
    { url: 'https://www.reutersagency.com/feed/?taxonomy=best-topics&post_type=best', name: 'Reuters Business', category: 'news' },
    
    // CNBC - Breaking financial news
    { url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html', name: 'CNBC Breaking News', category: 'news' },
    
    // MarketWatch - Market news
    { url: 'https://feeds.marketwatch.com/marketwatch/topstories/', name: 'MarketWatch Top Stories', category: 'news' },
    
    // Yahoo Finance - Business news
    { url: 'https://finance.yahoo.com/news/rssindex', name: 'Yahoo Finance', category: 'news' },
    
    // Seeking Alpha - Market analysis
    { url: 'https://seekingalpha.com/feed.xml', name: 'Seeking Alpha', category: 'news' },
    
    // Benzinga - Trading news
    { url: 'https://www.benzinga.com/feed', name: 'Benzinga', category: 'news' },
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
    
    // High-value keywords boost score
    const highValueKeywords = [
      'earnings', 'merger', 'acquisition', 'buyout', 'ipo', 'dividend',
      'sec', 'investigation', 'lawsuit', 'settlement', 'bankruptcy',
      'breakthrough', 'approval', 'fda', 'deal', 'contract',
      'beats estimates', 'misses estimates', 'guidance', 'outlook'
    ];

    const marketMovers = [
      'surges', 'plunges', 'rallies', 'crashes', 'soars', 'tumbles'
    ];

    for (const keyword of highValueKeywords) {
      if (text.includes(keyword)) score += 10;
    }

    for (const mover of marketMovers) {
      if (text.includes(mover)) score += 5;
    }

    // Recency bonus
    const hoursOld = (Date.now() - item.pubDate.getTime()) / (1000 * 60 * 60);
    if (hoursOld < 1) score += 15;
    else if (hoursOld < 6) score += 10;
    else if (hoursOld < 24) score += 5;

    // Title mentions ticker directly
    const tickers = this.extractTickers(item.title);
    if (tickers.length > 0) score += 10;

    return Math.min(100, score);
  }
}

export default new NewsAggregatorService();
