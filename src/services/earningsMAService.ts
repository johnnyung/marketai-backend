// backend/src/services/earningsMAService.ts
// Earnings Calendar & M&A Intelligence - Material Events, Earnings, Mergers

import axios from 'axios';
import * as cheerio from 'cheerio';

interface EarningsEvent {
  ticker: string;
  company: string;
  earningsDate: Date;
  estimatedEPS?: number;
  eventType: 'earnings' | 'guidance' | 'announcement';
  source: string;
}

interface MaterialEvent {
  ticker: string;
  company: string;
  eventType: string;
  title: string;
  content: string;
  filingDate: Date;
  url: string;
}

class EarningsMAService {
  
  private EARNINGS_RSS_FEEDS = [
    // Financial News - Earnings Coverage
    { url: 'https://www.investors.com/feed/', name: 'Investors Business Daily', category: 'earnings' },
    { url: 'https://www.thestreet.com/feeds/earnings.xml', name: 'TheStreet Earnings', category: 'earnings' },
    
    // M&A News
    { url: 'https://www.mergermarket.com/feed/', name: 'Mergermarket', category: 'ma' },
    
    // Corporate Actions
    { url: 'https://www.nasdaq.com/feed/rssoutbound?category=Dividends', name: 'NASDAQ Dividends', category: 'dividends' },
  ];

  /**
   * Get earnings announcements from RSS feeds
   */
  async getEarningsAnnouncements(): Promise<any[]> {
    const announcements: any[] = [];
    
    for (const feed of this.EARNINGS_RSS_FEEDS) {
      try {
        const items = await this.fetchRSSFeed(feed.url);
        
        const feedAnnouncements = items.map((item: any) => ({
          title: item.title || '',
          content: item.description || '',
          source: feed.name,
          category: feed.category,
          publishedDate: new Date(item.pubDate || Date.now()),
          url: item.link || ''
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
   * Get SEC 8-K filings (material events)
   */
  async getMaterialEvents(): Promise<MaterialEvent[]> {
    const events: MaterialEvent[] = [];
    
    try {
      // This would integrate with SEC EDGAR for 8-K filings
      // 8-K = Material events (M&A, earnings warnings, CEO changes, etc.)
      // For now, return empty to avoid breaking
      
      // TODO: Implement SEC 8-K scraping
      // Focus on Item 1.01 (M&A), 2.02 (Earnings), 5.02 (Officer changes)
      
      console.log(`  ⓘ SEC 8-K scraping: Not yet implemented`);
      return events;
    } catch (error) {
      console.error('  ✗ Material events failed:', error);
      return events;
    }
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
   * Calculate relevance score for earnings/M&A events
   */
  calculateRelevance(event: any): number {
    let score = 75; // Base score for earnings/M&A (high value)
    
    const text = `${event.title} ${event.content}`.toLowerCase();
    
    // Critical earnings keywords
    const earningsCritical = [
      'beats estimates', 'misses estimates', 'earnings surprise',
      'guidance raised', 'guidance lowered', 'outlook',
      'revenue surprise', 'eps beat', 'eps miss'
    ];
    
    // M&A critical keywords  
    const maCritical = [
      'acquisition', 'merger', 'buyout', 'takeover',
      'deal announced', 'to acquire', 'will acquire',
      'acquisition complete', 'merger complete'
    ];
    
    // High-value keywords
    const highValueKeywords = [
      'earnings', 'revenue', 'profit', 'margin',
      'dividend', 'stock split', 'buyback',
      'ceo', 'resignation', 'appointment',
      'restructuring', 'layoffs', 'expansion'
    ];
    
    // Check critical keywords (+20 each)
    for (const keyword of [...earningsCritical, ...maCritical]) {
      if (text.includes(keyword)) {
        score += 20;
        break;
      }
    }
    
    // Check high-value keywords (+10 each)
    for (const keyword of highValueKeywords) {
      if (text.includes(keyword)) score += 10;
    }
    
    // Large cap companies (more impact)
    const largeCaps = [
      'apple', 'microsoft', 'amazon', 'google', 'alphabet',
      'meta', 'tesla', 'nvidia', 'berkshire'
    ];
    
    for (const company of largeCaps) {
      if (text.includes(company)) {
        score += 15;
        break;
      }
    }
    
    // Recency bonus
    const hoursOld = (Date.now() - new Date(event.publishedDate).getTime()) / (1000 * 60 * 60);
    if (hoursOld < 1) score += 15;
    else if (hoursOld < 6) score += 10;
    else if (hoursOld < 24) score += 5;
    
    return Math.min(100, score);
  }

  /**
   * Extract tickers from earnings/M&A text
   */
  extractTickers(text: string): string[] {
    const tickers = new Set<string>();
    
    // Pattern for explicit ticker mentions
    const tickerPatterns = [
      /\(([A-Z]{1,5})\)/g,           // (AAPL)
      /\b([A-Z]{1,5}):\s*\$/g,       // AAPL: $
      /ticker:\s*([A-Z]{1,5})/gi,    // ticker: AAPL
      /\b([A-Z]{2,5})\s+stock/gi,    // AAPL stock
    ];
    
    for (const pattern of tickerPatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const ticker = match[1].toUpperCase();
        if (ticker && ticker.length >= 1 && ticker.length <= 5) {
          // Filter common false positives
          if (!['THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU', 'CEO', 'CFO', 'IPO'].includes(ticker)) {
            tickers.add(ticker);
          }
        }
      }
    }
    
    return Array.from(tickers).slice(0, 3); // Limit to 3 tickers
  }

  /**
   * Determine sentiment from earnings/M&A event
   */
  determineSentiment(event: any): 'bullish' | 'bearish' | 'neutral' {
    const text = `${event.title} ${event.content}`.toLowerCase();
    
    const bullishKeywords = [
      'beats', 'beat', 'exceeds', 'exceed', 'surprise',
      'raised', 'upgrade', 'growth', 'expansion',
      'acquisition', 'merger', 'buyback', 'dividend increase'
    ];
    
    const bearishKeywords = [
      'misses', 'miss', 'below', 'disappoint',
      'lowered', 'downgrade', 'decline', 'contraction',
      'layoffs', 'restructuring', 'warning', 'investigation'
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

export default new EarningsMAService();
