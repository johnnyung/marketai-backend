import axios from 'axios';
import * as cheerio from 'cheerio';

interface GovEvent {
  title: string;
  link: string;
  date: Date;
  source: string;
  type: string;
  summary?: string;
}

// Rotation topics for general discovery
const SEARCH_VECTORS = [
    'Artificial Intelligence', 'Semiconductors', 'Energy Infrastructure',
    'Biotech Grants', 'Defense Contracts', 'Crypto Regulation',
    'Trade Tariffs', 'Antitrust', 'Electric Vehicles', 'Nuclear Energy'
];

class GovernmentDataService {
  
  private headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  };

  private getTopic() {
      const minute = new Date().getMinutes();
      const index = minute % SEARCH_VECTORS.length;
      return SEARCH_VECTORS[index];
  }

  private async fetchRSS(url: string, source: string, type: string): Promise<GovEvent[]> {
      try {
          const res = await axios.get(url, { headers: this.headers, timeout: 8000 });
          const $ = cheerio.load(res.data, { xmlMode: true });
          const items: GovEvent[] = [];
          $('item').each((i, el) => {
              if (i >= 10) return;
              items.push({
                  title: $(el).find('title').text(),
                  link: $(el).find('link').text(),
                  date: new Date($(el).find('pubDate').text() || Date.now()),
                  summary: $(el).find('description').text().substring(0, 500), // Extended summary for analysis
                  source, type
              });
          });
          return items;
      } catch(e) { return []; }
  }

  // Google News Proxy for Topic Search
  private async fetchTopicRSS(sourceName: string, site: string, topic: string): Promise<GovEvent[]> {
      const url = `https://news.google.com/rss/search?q=site:${site}+${encodeURIComponent(topic)}&hl=en-US&gl=US&ceid=US:en`;
      return this.fetchRSS(url, sourceName, 'Search');
  }

  // --- SPECIFIC DATA VECTORS ---

  async getLegislation() {
      // 1. Congress.gov Most Viewed Bills (High Impact)
      const bills = await this.fetchRSS('https://www.congress.gov/rss/most-viewed-bills.xml', 'CONGRESS', 'Legislation');
      // 2. White House Legislation
      const wh = await this.fetchRSS('https://www.whitehouse.gov/feed/', 'WHITE_HOUSE', 'Executive Order');
      return [...bills, ...wh];
  }

  async getDefenseContracts() {
      return this.fetchTopicRSS('DOD', 'defense.gov', 'contract');
  }

  async getTreasuryUpdates() {
      return this.fetchTopicRSS('TREASURY', 'home.treasury.gov', this.getTopic());
  }
  
  async getDOJActions() {
      return this.fetchTopicRSS('DOJ', 'justice.gov', 'investigation');
  }

  async getFDAUpdates() {
      return this.fetchTopicRSS('FDA', 'fda.gov', 'approval');
  }

  async getAllGovData() {
      // Parallel fetch
      const [bills, dod, treasury, doj, fda] = await Promise.all([
          this.getLegislation(),
          this.getDefenseContracts(),
          this.getTreasuryUpdates(),
          this.getDOJActions(),
          this.getFDAUpdates()
      ]);
      return [...bills, ...dod, ...treasury, ...doj, ...fda];
  }

  async searchGovernmentData(keywords: string[]) {
      const all = await this.getAllGovData();
      return all.filter(item => keywords.some(kw => item.title.toLowerCase().includes(kw.toLowerCase())));
  }
}

export default new GovernmentDataService();
