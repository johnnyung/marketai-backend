import lazarusService from './lazarusService.js';
import { generateContentHash, extractTickers } from '../utils/dataUtils.js';

interface GovernmentAnnouncement {
  title: string;
  content: string;
  source: string;
  publishedDate: Date;
  url: string;
  category: string;
}

class PoliticalIntelligenceService {
  
  // Using Lazarus (Google News Proxy) is more reliable than direct .xml feeds which often 404/403
  private SOURCES = [
    { name: 'Federal Reserve', query: 'site:federalreserve.gov "press release"', category: 'monetary_policy' },
    { name: 'White House', query: 'site:whitehouse.gov/briefing-room "statement"', category: 'executive' },
    { name: 'US Treasury', query: 'site:home.treasury.gov "press releases"', category: 'fiscal_policy' },
    { name: 'SEC Enforcement', query: 'site:sec.gov/news/pressreleases "charged"', category: 'enforcement' },
    { name: 'CFTC', query: 'site:cftc.gov "release"', category: 'commodities' }
  ];

  async getGovernmentAnnouncements(): Promise<GovernmentAnnouncement[]> {
    const announcements: GovernmentAnnouncement[] = [];
    
    for (const src of this.SOURCES) {
      try {
        // Use Lazarus Service for robust fetching
        const result = await lazarusService.fetchOrResurrect(src.query);
        
        if (result.success && result.data.length > 0) {
            for (const item of result.data.slice(0, 5)) {
                const title = item.title?.[0] || '';
                const link = item.link?.[0] || '';
                const pubDate = item.pubDate?.[0] ? new Date(item.pubDate[0]) : new Date();
                
                // Clean HTML tags if any
                const cleanTitle = title.replace(/<[^>]*>?/gm, '');

                if (cleanTitle) {
                    announcements.push({
                        title: cleanTitle,
                        content: cleanTitle, // RSS often has title as summary
                        source: src.name,
                        publishedDate: pubDate,
                        url: link,
                        category: src.category
                    });
                }
            }
            // console.log(`   ✓ ${src.name}: ${announcements.length} items`);
        }
      } catch (error) {
        // Silent fail for individual sources
      }
      // Rate limit
      await new Promise(r => setTimeout(r, 500));
    }
    
    return announcements;
  }

  // Kept for compatibility
  async getCongressionalTrades() { return []; }
  calculateRelevance(type: string, data: any) { return 75; }
  extractTickers(text: string) { return extractTickers(text); }
}

export default new PoliticalIntelligenceService();
