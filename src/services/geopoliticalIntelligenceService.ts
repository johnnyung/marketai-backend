// backend/src/services/geopoliticalIntelligenceService.ts
// Geopolitical Intelligence - Wars, Sanctions, Defense, Treaties

import axios from 'axios';
import * as cheerio from 'cheerio';

interface GeopoliticalEvent {
  title: string;
  content: string;
  source: string;
  category: string;
  region: string;
  publishedDate: Date;
  url: string;
}

class GeopoliticalIntelligenceService {
  
  private GEOPOLITICAL_RSS_FEEDS = [
    // Conflict & War Monitoring
    { url: 'https://www.understandingwar.org/rss.xml', name: 'Institute for Study of War', category: 'conflict', region: 'global' },
    
    // Defense & Military
    { url: 'https://www.defense.gov/DesktopModules/ArticleCS/RSS.ashx?ContentType=1&Site=945', name: 'US Department of Defense', category: 'defense', region: 'US' },
    { url: 'https://www.nato.int/rss/rss-news.xml', name: 'NATO', category: 'defense', region: 'global' },
    
    // Sanctions & Trade
    { url: 'https://home.treasury.gov/rss/press-releases', name: 'US Treasury (Sanctions)', category: 'sanctions', region: 'US' },
    
    // International Relations
    { url: 'https://www.un.org/rss/news.xml', name: 'United Nations', category: 'diplomacy', region: 'global' },
    { url: 'https://www.state.gov/rss-feed/', name: 'US State Department', category: 'diplomacy', region: 'US' },
    
    // Regional Intelligence
    { url: 'https://www.mei.edu/rss', name: 'Middle East Institute', category: 'regional', region: 'middle_east' },
    
    // Think Tanks
    { url: 'https://www.csis.org/analysis/feed', name: 'CSIS', category: 'analysis', region: 'global' },
  ];

  /**
   * Get geopolitical events from all sources
   */
  async getGeopoliticalEvents(): Promise<GeopoliticalEvent[]> {
    const events: GeopoliticalEvent[] = [];
    
    for (const feed of this.GEOPOLITICAL_RSS_FEEDS) {
      try {
        const items = await this.fetchRSSFeed(feed.url);
        
        const feedEvents = items.map((item: any) => ({
          title: item.title || '',
          content: item.description || '',
          source: feed.name,
          category: feed.category,
          region: feed.region,
          publishedDate: new Date(item.pubDate || Date.now()),
          url: item.link || ''
        }));
        
        events.push(...feedEvents);
        console.log(`  ✓ ${feed.name}: ${feedEvents.length} events`);
      } catch (error) {
        console.error(`  ✗ ${feed.name} failed:`, error instanceof Error ? error.message : 'Unknown');
      }
    }
    
    return events;
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
   * Calculate relevance score for geopolitical events
   */
  calculateRelevance(event: GeopoliticalEvent): number {
    let score = 70; // Base score for geopolitical events
    
    const text = `${event.title} ${event.content}`.toLowerCase();
    
    // Critical events (major market impact)
    const criticalKeywords = [
      'war', 'invasion', 'attack', 'strike', 'bombing', 'conflict',
      'sanctions', 'embargo', 'blockade', 'tariff war',
      'coup', 'revolution', 'regime change',
      'nuclear', 'missile', 'weapon',
      'treaty signed', 'peace deal', 'ceasefire'
    ];
    
    // High-impact events
    const highImpactKeywords = [
      'military', 'defense', 'nato', 'alliance',
      'trade agreement', 'trade war', 'tariff',
      'diplomatic', 'sanctions list', 'export control',
      'energy crisis', 'oil', 'gas', 'pipeline',
      'cybersecurity', 'cyber attack', 'espionage'
    ];
    
    // Check critical keywords (+20 each)
    for (const keyword of criticalKeywords) {
      if (text.includes(keyword)) {
        score += 20;
        break; // Only add once
      }
    }
    
    // Check high-impact keywords (+12 each)
    for (const keyword of highImpactKeywords) {
      if (text.includes(keyword)) score += 12;
    }
    
    // Regions with high market impact
    const keyRegions = [
      'russia', 'ukraine', 'china', 'taiwan',
      'middle east', 'iran', 'israel', 'saudi',
      'europe', 'nato', 'g7', 'g20'
    ];
    
    for (const region of keyRegions) {
      if (text.includes(region)) {
        score += 8;
        break;
      }
    }
    
    // Energy-related geopolitics (high market impact)
    const energyKeywords = ['oil', 'gas', 'energy', 'pipeline', 'opec'];
    for (const keyword of energyKeywords) {
      if (text.includes(keyword)) {
        score += 10;
        break;
      }
    }
    
    // Recency bonus
    const hoursOld = (Date.now() - event.publishedDate.getTime()) / (1000 * 60 * 60);
    if (hoursOld < 6) score += 10;
    else if (hoursOld < 24) score += 5;
    
    return Math.min(100, score);
  }

  /**
   * Extract relevant tickers from geopolitical text
   */
  extractRelevantTickers(text: string): string[] {
    const tickers = new Set<string>();
    
    const textLower = text.toLowerCase();
    
    // Defense contractors
    if (textLower.includes('lockheed') || textLower.includes('defense')) {
      tickers.add('LMT');
    }
    if (textLower.includes('raytheon') || textLower.includes('rtx')) {
      tickers.add('RTX');
    }
    if (textLower.includes('boeing')) {
      tickers.add('BA');
    }
    if (textLower.includes('northrop')) {
      tickers.add('NOC');
    }
    
    // Energy
    if (textLower.includes('exxon')) tickers.add('XOM');
    if (textLower.includes('chevron')) tickers.add('CVX');
    if (textLower.includes('oil') || textLower.includes('energy')) {
      tickers.add('XLE'); // Energy sector ETF
    }
    
    // Commodities
    if (textLower.includes('gold')) tickers.add('GLD');
    if (textLower.includes('uranium')) tickers.add('URA');
    
    return Array.from(tickers);
  }

  /**
   * Determine market sentiment from geopolitical event
   */
  determineSentiment(event: GeopoliticalEvent): 'bullish' | 'bearish' | 'neutral' {
    const text = `${event.title} ${event.content}`.toLowerCase();
    
    // Bearish indicators (conflict, uncertainty)
    const bearishKeywords = [
      'war', 'invasion', 'attack', 'conflict', 'crisis',
      'sanctions', 'embargo', 'tension', 'escalation'
    ];
    
    // Bullish indicators (peace, cooperation)
    const bullishKeywords = [
      'peace', 'treaty', 'agreement', 'cooperation',
      'alliance', 'ceasefire', 'resolution', 'stability'
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

export default new GeopoliticalIntelligenceService();
