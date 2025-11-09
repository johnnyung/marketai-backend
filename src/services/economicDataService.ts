// backend/src/services/economicDataService.ts
// Economic Indicators & Data - Free Government Sources

import axios from 'axios';
import * as cheerio from 'cheerio';

interface EconomicIndicator {
  indicator: string;
  value: string;
  previousValue?: string;
  date: Date;
  source: string;
  category: string;
  changePercent?: number;
}

class EconomicDataService {
  
  private ECONOMIC_RSS_FEEDS = [
    // Bureau of Labor Statistics
    { url: 'https://www.bls.gov/feed/bls_latest.rss', name: 'BLS Economic News', category: 'employment' },
    
    // US Census Bureau
    { url: 'https://www.census.gov/economic-indicators/indicator.xml', name: 'Census Economic Indicators', category: 'economic' },
    
    // Federal Reserve Economic Data (FRED)
    { url: 'https://fred.stlouisfed.org/feed/rss', name: 'FRED Updates', category: 'economic' },
    
    // Commerce Department
    { url: 'https://www.commerce.gov/news/all-news/feed', name: 'Commerce Department', category: 'trade' },
  ];

  /**
   * Get economic indicators from RSS feeds
   */
  async getEconomicIndicators(): Promise<EconomicIndicator[]> {
    const indicators: EconomicIndicator[] = [];
    
    for (const feed of this.ECONOMIC_RSS_FEEDS) {
      try {
        const items = await this.fetchRSSFeed(feed.url);
        
        const feedIndicators = items.map((item: any) => {
          const extracted = this.extractIndicatorData(item.title, item.description);
          return {
            indicator: item.title,
            value: extracted.value,
            previousValue: extracted.previousValue,
            date: new Date(item.pubDate || Date.now()),
            source: feed.name,
            category: feed.category,
            changePercent: extracted.changePercent
          };
        });
        
        indicators.push(...feedIndicators);
        console.log(`  ✓ ${feed.name}: ${feedIndicators.length} indicators`);
      } catch (error) {
        console.error(`  ✗ ${feed.name} failed:`, error instanceof Error ? error.message : 'Unknown');
      }
    }
    
    return indicators;
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
          description: $item.find('description, summary').first().text(),
          link: $item.find('link').attr('href') || $item.find('link').text(),
          pubDate: $item.find('pubDate, published').first().text(),
        });
      });

      return items;
    } catch (error) {
      throw new Error(`RSS fetch failed: ${error}`);
    }
  }

  /**
   * Extract numeric data from text
   */
  private extractIndicatorData(title: string, description: string): {
    value: string;
    previousValue?: string;
    changePercent?: number;
  } {
    const text = `${title} ${description}`;
    
    // Try to extract percentage changes
    const percentMatch = text.match(/(\d+\.?\d*)%/);
    const changePercent = percentMatch ? parseFloat(percentMatch[1]) : undefined;
    
    // Try to extract values
    const valueMatch = text.match(/\$?([\d,]+\.?\d*)\s*(billion|million|trillion|percent|%)?/i);
    const value = valueMatch ? valueMatch[0] : 'N/A';
    
    return {
      value,
      changePercent
    };
  }

  /**
   * Calculate relevance score for economic data
   */
  calculateRelevance(indicator: EconomicIndicator): number {
    let score = 80; // Base score for economic data (always important)
    
    const text = `${indicator.indicator} ${indicator.category}`.toLowerCase();
    
    // High-impact indicators
    const criticalIndicators = [
      'unemployment', 'jobs report', 'nonfarm payroll', 'cpi', 'inflation',
      'gdp', 'retail sales', 'housing starts', 'consumer confidence',
      'fed rate', 'fomc', 'pce', 'personal income'
    ];
    
    if (criticalIndicators.some(ind => text.includes(ind))) {
      score += 15;
    }
    
    // Large changes are more relevant
    if (indicator.changePercent) {
      if (Math.abs(indicator.changePercent) > 1) score += 10;
      if (Math.abs(indicator.changePercent) > 5) score += 10;
    }
    
    // Recency bonus
    const hoursOld = (Date.now() - indicator.date.getTime()) / (1000 * 60 * 60);
    if (hoursOld < 1) score += 10;
    else if (hoursOld < 6) score += 5;
    
    return Math.min(100, score);
  }

  /**
   * Get major economic releases (scheduled)
   */
  async getUpcomingReleases(): Promise<any[]> {
    // This would fetch from economic calendar APIs
    // For now, return empty array
    // TODO: Integrate with free economic calendar sources
    return [];
  }

  /**
   * Parse indicator type
   */
  parseIndicatorType(text: string): string {
    const text_lower = text.toLowerCase();
    
    if (text_lower.includes('employment') || text_lower.includes('unemployment') || text_lower.includes('jobs')) {
      return 'employment';
    }
    if (text_lower.includes('inflation') || text_lower.includes('cpi') || text_lower.includes('pce')) {
      return 'inflation';
    }
    if (text_lower.includes('gdp') || text_lower.includes('growth')) {
      return 'growth';
    }
    if (text_lower.includes('retail') || text_lower.includes('sales') || text_lower.includes('spending')) {
      return 'consumer';
    }
    if (text_lower.includes('housing') || text_lower.includes('home')) {
      return 'housing';
    }
    if (text_lower.includes('manufacturing') || text_lower.includes('industrial')) {
      return 'manufacturing';
    }
    
    return 'general';
  }
}

export default new EconomicDataService();
