// backend/src/services/manufacturingSupplyChainService.ts
// Manufacturing & Supply Chain Intelligence - ISM, Ports, Factory Data

import axios from 'axios';
import * as cheerio from 'cheerio';

interface ManufacturingData {
  title: string;
  content: string;
  source: string;
  category: string;
  publishedDate: Date;
  url: string;
  indicator?: string;
  value?: number;
}

class ManufacturingSupplyChainService {
  
  private MANUFACTURING_RSS_FEEDS = [
    // Manufacturing Indices
    { url: 'https://www.ismworld.org/supply-management-news-and-reports/rss/', name: 'ISM Manufacturing', category: 'manufacturing' },
    
    // Supply Chain News
    { url: 'https://www.supplychaindive.com/feeds/news/', name: 'Supply Chain Dive', category: 'supply_chain' },
    { url: 'https://www.freightwaves.com/news/feed', name: 'FreightWaves', category: 'logistics' },
    
    // Port & Shipping
    { url: 'https://www.joc.com/rss/maritime-news', name: 'Journal of Commerce', category: 'ports' },
    
    // Industrial Production
    { url: 'https://www.industryweek.com/rss', name: 'IndustryWeek', category: 'industrial' },
  ];

  /**
   * Get manufacturing and supply chain data
   */
  async getManufacturingData(): Promise<ManufacturingData[]> {
    const data: ManufacturingData[] = [];
    
    for (const feed of this.MANUFACTURING_RSS_FEEDS) {
      try {
        const items = await this.fetchRSSFeed(feed.url);
        
        const feedData = items.map((item: any) => ({
          title: item.title || '',
          content: item.description || '',
          source: feed.name,
          category: feed.category,
          publishedDate: new Date(item.pubDate || Date.now()),
          url: item.link || ''
        }));
        
        data.push(...feedData);
        console.log(`  ✓ ${feed.name}: ${feedData.length} updates`);
      } catch (error) {
        console.error(`  ✗ ${feed.name} failed:`, error instanceof Error ? error.message : 'Unknown');
      }
    }
    
    return data;
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
  calculateRelevance(data: ManufacturingData): number {
    let score = 65; // Base score
    
    const text = `${data.title} ${data.content}`.toLowerCase();
    
    // High-impact keywords
    const criticalKeywords = [
      'shortage', 'disruption', 'bottleneck', 'delayed',
      'factory closure', 'strike', 'embargo',
      'ism index', 'pmi', 'manufacturing index'
    ];
    
    const importantKeywords = [
      'supply chain', 'inventory', 'production',
      'shipping', 'port', 'freight', 'logistics',
      'semiconductor', 'chip', 'raw materials'
    ];
    
    for (const keyword of criticalKeywords) {
      if (text.includes(keyword)) score += 15;
    }
    
    for (const keyword of importantKeywords) {
      if (text.includes(keyword)) score += 8;
    }
    
    // Recency
    const hoursOld = (Date.now() - data.publishedDate.getTime()) / (1000 * 60 * 60);
    if (hoursOld < 6) score += 10;
    else if (hoursOld < 24) score += 5;
    
    return Math.min(100, score);
  }

  /**
   * Extract relevant tickers
   */
  extractRelevantTickers(text: string): string[] {
    const tickers = new Set<string>();
    const textLower = text.toLowerCase();
    
    // Industrial/Manufacturing companies
    if (textLower.includes('caterpillar')) tickers.add('CAT');
    if (textLower.includes('ge') || textLower.includes('general electric')) tickers.add('GE');
    if (textLower.includes('3m')) tickers.add('MMM');
    if (textLower.includes('boeing')) tickers.add('BA');
    if (textLower.includes('honeywell')) tickers.add('HON');
    
    // Shipping/Logistics
    if (textLower.includes('fedex')) tickers.add('FDX');
    if (textLower.includes('ups')) tickers.add('UPS');
    if (textLower.includes('maersk')) tickers.add('AMKBY');
    
    // Semiconductors (supply chain critical)
    if (textLower.includes('semiconductor') || textLower.includes('chip')) {
      tickers.add('SOXX'); // Semiconductor ETF
    }
    
    return Array.from(tickers);
  }

  /**
   * Determine sentiment
   */
  determineSentiment(data: ManufacturingData): 'bullish' | 'bearish' | 'neutral' {
    const text = `${data.title} ${data.content}`.toLowerCase();
    
    const bearishKeywords = [
      'shortage', 'disruption', 'delay', 'bottleneck',
      'decline', 'contraction', 'slowing', 'weak'
    ];
    
    const bullishKeywords = [
      'expansion', 'growth', 'recovery', 'improving',
      'easing', 'resolved', 'strong', 'increase'
    ];
    
    let bearishCount = 0;
    let bullishCount = 0;
    
    for (const keyword of bearishKeywords) {
      if (text.includes(keyword)) bearishCount++;
    }
    
    for (const keyword of bullishKeywords) {
      if (text.includes(keyword)) bullishCount++;
    }
    
    if (bearishCount > bullishCount) return 'bearish';
    if (bullishCount > bearishCount) return 'bullish';
    return 'neutral';
  }
}

export default new ManufacturingSupplyChainService();
