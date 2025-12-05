interface NewsItem {
  title: string;
  description: string;
  link: string;
  pubDate: Date;
  source: string;
}

class NewsAggregatorService {
  
  async getAllNews(): Promise<NewsItem[]> {
      return [
          {
              title: "Market Stabilizes",
              description: "Stocks flat...",
              link: "#",
              pubDate: new Date(),
              source: "MarketAI Wire"
          }
      ];
  }

  async getRecentNews(hours: number = 24): Promise<NewsItem[]> {
      return this.getAllNews();
  }

  calculateRelevance(article: any): number {
      return 50;
  }

  extractTickers(text: string): string[] {
      return ['SPY'];
  }
}

export default new NewsAggregatorService();
