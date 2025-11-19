// backend/src/services/localBusinessService.ts
// Local Business News - Major US City Business Journals

import axios from 'axios';
import * as cheerio from 'cheerio';

interface LocalBusinessNews {
  title: string;
  content: string;
  source: string;
  city: string;
  category: string;
  publishedDate: Date;
  url: string;
}

class LocalBusinessService {
  
  private LOCAL_BUSINESS_RSS_FEEDS = [
    // Major US Cities
    { url: 'https://www.bizjournals.com/sanfrancisco/news/feed', name: 'San Francisco Business Times', city: 'San Francisco', category: 'local_business' },
    { url: 'https://www.bizjournals.com/losangeles/news/feed', name: 'LA Business Journal', city: 'Los Angeles', category: 'local_business' },
    { url: 'https://www.bizjournals.com/newyork/news/feed', name: 'New York Business Journal', city: 'New York', category: 'local_business' },
    { url: 'https://www.bizjournals.com/chicago/news/feed', name: 'Chicago Business', city: 'Chicago', category: 'local_business' },
    { url: 'https://www.bizjournals.com/boston/news/feed', name: 'Boston Business Journal', city: 'Boston', category: 'local_business' },
    { url: 'https://www.bizjournals.com/seattle/news/feed', name: 'Seattle Business', city: 'Seattle', category: 'local_business' },
    { url: 'https://www.bizjournals.com/austin/news/feed', name: 'Austin Business Journal', city: 'Austin', category: 'local_business' },
    { url: 'https://www.bizjournals.com/dallas/news/feed', name: 'Dallas Business Journal', city: 'Dallas', category: 'local_business' },
  ];

  /**
   * Get local business news from all cities
   */
  async getLocalBusinessNews(): Promise<LocalBusinessNews[]> {
    const news: LocalBusinessNews[] = [];
    
    for (const feed of this.LOCAL_BUSINESS_RSS_FEEDS) {
      try {
        const items = await this.fetchRSSFeed(feed.url);
        
        const feedNews = items.map((item: any) => ({
          title: item.title || '',
          content: item.description || '',
          source: feed.name,
          city: feed.city,
          category: feed.category,
          publishedDate: new Date(item.pubDate || Date.now()),
          url: item.link || ''
        }));
        
        news.push(...feedNews);
        console.log(`  ✓ ${feed.name}: ${feedNews.length} articles`);
      } catch (error) {
        console.error(`  ✗ ${feed.name} failed:`, error instanceof Error ? error.message : 'Unknown');
      }
    }
    
    return news;
  }

  /**
   * Fetch RSS feed
   */
  private async fetchRSSFeed(url: string): Promise<any[]> {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'MarketAI/1.0'
        }
      });

      const $ = cheerio.load(response.data, { xmlMode: true });
      const items: any[] = [];

      $('item, entry').each((_, element) => {
        const $item = $(element);
        items.push({
          title: $item.find('title').text(),
          description: $item.find('description, summary, content').first().text(),
          link: $item.find('link').attr('href') || $item.find('link').text(),
          pubDate: $item.find('pubDate, published, updated').first().text(),
        });
      });

      return items;
    } catch (error) {
      throw new Error(`RSS fetch failed: ${error}`);
    }
  }

  /**
   * Calculate relevance score
   */
  calculateRelevance(news: LocalBusinessNews): number {
    let score = 45; // Base score for local news
    
    const text = `${news.title} ${news.content}`.toLowerCase();
    
    // High-value local keywords
    const criticalKeywords = [
      'acquisition', 'merger', 'ipo', 'funding',
      'expansion', 'headquarters', 'relocating',
      'layoffs', 'hiring', 'closing'
    ];
    
    const importantKeywords = [
      'real estate', 'development', 'construction',
      'startup', 'venture capital', 'investment',
      'tech hub', 'innovation district'
    ];
    
    for (const keyword of criticalKeywords) {
      if (text.includes(keyword)) score += 15;
    }
    
    for (const keyword of importantKeywords) {
      if (text.includes(keyword)) score += 8;
    }
    
    // Major tech hubs get higher scores (more market impact)
    const majorTechCities = ['San Francisco', 'Seattle', 'Austin', 'New York'];
    if (majorTechCities.includes(news.city)) {
      score += 10;
    }
    
    // Recency
    const hoursOld = (Date.now() - news.publishedDate.getTime()) / (1000 * 60 * 60);
    if (hoursOld < 24) score += 5;
    
    return Math.min(100, score);
  }

  /**
   * Extract tickers from local business news
   */
  extractTickers(text: string): string[] {
    const tickers = new Set<string>();
    
    // Pattern for explicit ticker mentions
    const tickerPattern = /\(([A-Z]{1,5})\)/g;
    const matches = text.matchAll(tickerPattern);
    
    for (const match of matches) {
      const ticker = match[1];
      if (ticker && ticker.length >= 1 && ticker.length <= 5) {
        tickers.add(ticker);
      }
    }
    
    return Array.from(tickers);
  }

  /**
   * Determine sentiment
   */
  determineSentiment(news: LocalBusinessNews): 'bullish' | 'bearish' | 'neutral' {
    const text = `${news.title} ${news.content}`.toLowerCase();
    
    const bullishKeywords = [
      'expansion', 'growth', 'hiring', 'opening',
      'investment', 'funding', 'acquisition', 'ipo'
    ];
    
    const bearishKeywords = [
      'layoffs', 'closing', 'bankrupt', 'struggling',
      'decline', 'cuts', 'downsizing'
    ];
    
    let bullishCount = 0;
    let bearishCount = 0;
    
    for (const keyword of bullishKeywords) {
      if (text.includes(keyword)) bullishCount++;
    }
    
    for (const keyword of bearishKeywords) {
      if (text.includes(keyword)) bearishCount++;
    }
    
    if (bullishCount > bearishCount) return 'bullish';
    if (bearishCount > bullishCount) return 'bearish';
    return 'neutral';
  }
}

export default new LocalBusinessService();
