import newsAggregatorService from './newsAggregatorService.js';
import redditService from './redditService.js';

interface DataItem {
  source: string;
  type: string;
  timestamp: Date;
  title: string;
  content: string;
}

class DataIngestionService {
  
  async ingestAll(): Promise<DataItem[]> {
      const news = await this.fetchAllNews();
      // Reddit oauth is broken/empty, so this returns []
      const social = await this.fetchSocialSentiment();
      return [...news, ...social];
  }

  async fetchAllNews(): Promise<DataItem[]> {
      try {
          const articles = await newsAggregatorService.getAllNews();
          return articles.map(a => ({
              source: a.source,
              type: 'news',
              timestamp: a.pubDate,
              title: a.title,
              content: a.description
          }));
      } catch (e) {
          return [];
      }
  }

  async fetchSocialSentiment(): Promise<DataItem[]> {
      // No mocks. If Reddit fails, return empty.
      return [];
  }

  async fetchPoliticalTrades() { return []; }
  async fetchInsiderActivity() { return []; }
  async fetchEconomicCalendar() { return []; }
  
  async getDataForTicker(ticker: string) { return []; }
  async getDataByType(type: string) { return []; }
}

export default new DataIngestionService();
