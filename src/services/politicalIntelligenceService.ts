// backend/src/services/politicalIntelligenceService.ts
// Political Trading & Government Intelligence - Free Sources

import axios from 'axios';
import * as cheerio from 'cheerio';

interface CongressionalTrade {
  representative: string;
  ticker: string;
  transactionType: 'buy' | 'sell';
  transactionDate: Date;
  amount: string;
  disclosureDate: Date;
  party: string;
  chamber: 'House' | 'Senate';
}

interface GovernmentAnnouncement {
  title: string;
  content: string;
  source: string;
  publishedDate: Date;
  url: string;
  category: string;
}

class PoliticalIntelligenceService {
  
  private GOVERNMENT_RSS_FEEDS = [
    // Federal Reserve
    { url: 'https://www.federalreserve.gov/feeds/press_all.xml', name: 'Federal Reserve', category: 'monetary_policy' },
    
    // White House
    { url: 'https://www.whitehouse.gov/feed/', name: 'White House', category: 'executive' },
    
    // Treasury Department
    { url: 'https://home.treasury.gov/rss/press-releases', name: 'US Treasury', category: 'fiscal_policy' },
    
    // SEC - Enforcement & Investor Alerts
    { url: 'https://www.sec.gov/news/pressreleases.rss', name: 'SEC Press Releases', category: 'enforcement' },
    
    // CFTC - Commodities & Futures
    { url: 'https://www.cftc.gov/rss/PressReleases/rss.xml', name: 'CFTC', category: 'commodities' },
  ];

  /**
   * Get congressional stock trades from free sources
   */
  async getCongressionalTrades(): Promise<CongressionalTrade[]> {
    const trades: CongressionalTrade[] = [];
    
    try {
      // Try House Stock Watcher (free public data)
      const houseStockTrades = await this.scrapeHouseStockWatcher();
      trades.push(...houseStockTrades);
      console.log(`  ✓ House Stock Watcher: ${houseStockTrades.length} trades`);
    } catch (error) {
      console.error('  ✗ House Stock Watcher failed:', error instanceof Error ? error.message : 'Unknown');
    }

    try {
      // Try Senate Stock Watcher (free public data)
      const senateTrades = await this.scrapeSenateDisclosures();
      trades.push(...senateTrades);
      console.log(`  ✓ Senate Disclosures: ${senateTrades.length} trades`);
    } catch (error) {
      console.error('  ✗ Senate Disclosures failed:', error instanceof Error ? error.message : 'Unknown');
    }

    return trades;
  }

  /**
   * Scrape House Stock Watcher (public data aggregator)
   */
  private async scrapeHouseStockWatcher(): Promise<CongressionalTrade[]> {
    const trades: CongressionalTrade[] = [];
    
    try {
      // This is a placeholder - actual implementation would scrape from:
      // - housestockwatcher.com (public aggregator)
      // - Or use their API if available
      // For now, return empty array to avoid breaking
      
      // TODO: Implement actual scraping or use API
      return trades;
    } catch (error) {
      throw new Error(`House Stock Watcher scraping failed: ${error}`);
    }
  }

  /**
   * Scrape Senate stock disclosures (from senate.gov)
   */
  private async scrapeSenateDisclosures(): Promise<CongressionalTrade[]> {
    const trades: CongressionalTrade[] = [];
    
    try {
      // This is a placeholder - actual implementation would scrape from:
      // - efdsearch.senate.gov (official Senate financial disclosures)
      // For now, return empty array to avoid breaking
      
      // TODO: Implement actual scraping
      return trades;
    } catch (error) {
      throw new Error(`Senate disclosure scraping failed: ${error}`);
    }
  }

  /**
   * Get government announcements from RSS feeds
   */
  async getGovernmentAnnouncements(): Promise<GovernmentAnnouncement[]> {
    const announcements: GovernmentAnnouncement[] = [];
    
    for (const feed of this.GOVERNMENT_RSS_FEEDS) {
      try {
        const items = await this.fetchRSSFeed(feed.url);
        
        const feedAnnouncements = items.map((item: any) => ({
          title: item.title || '',
          content: item.description || item.summary || '',
          source: feed.name,
          publishedDate: new Date(item.pubDate || item.published || Date.now()),
          url: item.link || '',
          category: feed.category
        }));
        
        announcements.push(...feedAnnouncements);
        console.log(`  ✓ ${feed.name}: ${feedAnnouncements.length} announcements`);
      } catch (error) {
        console.error(`  ✗ ${feed.name} failed:`, error instanceof Error ? error.message : 'Unknown');
      }
    }
    
    return announcements;
  }

  /**
   * Generic RSS feed fetcher
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
   * Calculate relevance score for political data
   */
  calculateRelevance(type: 'trade' | 'announcement', data: any): number {
    if (type === 'trade') {
      // Congressional trades are always high value
      const trade = data as CongressionalTrade;
      let score = 85; // Base score for political trades
      
      // Large transactions are more relevant
      if (trade.amount.includes('$1,000,001') || trade.amount.includes('$5,000,001')) {
        score += 10;
      }
      
      // Leadership positions matter more
      const leadership = ['speaker', 'majority', 'minority', 'chair', 'ranking'];
      if (leadership.some(role => trade.representative.toLowerCase().includes(role))) {
        score += 5;
      }
      
      return Math.min(100, score);
    }
    
    if (type === 'announcement') {
      const announcement = data as GovernmentAnnouncement;
      let score = 70; // Base score for government announcements
      
      const text = `${announcement.title} ${announcement.content}`.toLowerCase();
      
      // Fed-related keywords
      const fedKeywords = ['rate', 'inflation', 'monetary policy', 'fomc', 'interest rate'];
      if (fedKeywords.some(keyword => text.includes(keyword))) {
        score += 15;
      }
      
      // SEC enforcement
      const secKeywords = ['fraud', 'enforcement', 'charges', 'settlement', 'investigation'];
      if (secKeywords.some(keyword => text.includes(keyword))) {
        score += 10;
      }
      
      // High-impact policy
      const policyKeywords = ['executive order', 'regulation', 'sanction', 'tariff', 'trade'];
      if (policyKeywords.some(keyword => text.includes(keyword))) {
        score += 10;
      }
      
      // Recency bonus
      const hoursOld = (Date.now() - announcement.publishedDate.getTime()) / (1000 * 60 * 60);
      if (hoursOld < 1) score += 10;
      else if (hoursOld < 6) score += 5;
      
      return Math.min(100, score);
    }
    
    return 50;
  }

  /**
   * Extract tickers from government text
   */
  extractTickers(text: string): string[] {
    const tickers = new Set<string>();
    
    // Pattern for explicit ticker mentions
    const patterns = [
      /\b([A-Z]{1,5})\s+(?:stock|shares|equity)/gi,
      /ticker:\s*([A-Z]{1,5})/gi,
    ];
    
    for (const pattern of patterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const ticker = match[1];
        if (ticker && ticker.length >= 1 && ticker.length <= 5) {
          tickers.add(ticker);
        }
      }
    }
    
    return Array.from(tickers);
  }
}

export default new PoliticalIntelligenceService();
