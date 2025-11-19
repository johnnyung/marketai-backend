// backend/src/services/newsApiService.ts
// NewsAPI Integration - Aggregate 100+ News Sources
// Free Tier: 100 requests/day
// API Docs: https://newsapi.org/docs

import axios from 'axios';

const NEWS_API_KEY = process.env.NEWS_API_KEY;
const BASE_URL = 'https://newsapi.org/v2';

interface NewsArticle {
  source: {
    id: string | null;
    name: string;
  };
  author: string | null;
  title: string;
  description: string;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  content: string;
}

interface NewsResponse {
  status: string;
  totalResults: number;
  articles: NewsArticle[];
}

class NewsApiService {
  
  /**
   * Get top financial headlines
   */
  async getTopHeadlines(category: 'business' | 'technology' = 'business', limit: number = 20): Promise<NewsArticle[]> {
    console.log(`📰 NewsAPI: Fetching top ${category} headlines...`);
    
    try {
      const response = await axios.get<NewsResponse>(`${BASE_URL}/top-headlines`, {
        params: {
          category,
          language: 'en',
          country: 'us',
          pageSize: limit,
          apiKey: NEWS_API_KEY
        },
        timeout: 10000
      });

      console.log(`  ✓ Found ${response.data.articles.length} headlines`);
      return response.data.articles;
      
    } catch (error: any) {
      console.error(`  ✗ NewsAPI error:`, error.message);
      return [];
    }
  }

  /**
   * Search news for specific company/ticker
   */
  async searchCompanyNews(
    query: string,
    from?: string,
    to?: string,
    limit: number = 20
  ): Promise<NewsArticle[]> {
    console.log(`📰 NewsAPI: Searching for "${query}"...`);
    
    try {
      const params: any = {
        q: query,
        language: 'en',
        sortBy: 'relevancy',
        pageSize: limit,
        apiKey: NEWS_API_KEY
      };

      if (from) params.from = from;
      if (to) params.to = to;

      const response = await axios.get<NewsResponse>(`${BASE_URL}/everything`, {
        params,
        timeout: 10000
      });

      console.log(`  ✓ Found ${response.data.articles.length} articles for "${query}"`);
      return response.data.articles;
      
    } catch (error: any) {
      console.error(`  ✗ NewsAPI error:`, error.message);
      return [];
    }
  }

  /**
   * Get news for specific ticker (last 7 days)
   */
  async getTickerNews(ticker: string, companyName?: string, limit: number = 20): Promise<NewsArticle[]> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const from = sevenDaysAgo.toISOString().split('T')[0];

    // Build query with ticker and company name if provided
    const query = companyName 
      ? `${ticker} OR "${companyName}"`
      : ticker;

    return await this.searchCompanyNews(query, from, undefined, limit);
  }

  /**
   * Get financial market news
   */
  async getFinancialNews(keywords: string[] = ['stocks', 'market', 'trading'], limit: number = 30): Promise<NewsArticle[]> {
    console.log(`📰 NewsAPI: Fetching financial news...`);
    
    const query = keywords.join(' OR ');
    
    try {
      const response = await axios.get<NewsResponse>(`${BASE_URL}/everything`, {
        params: {
          q: query,
          language: 'en',
          sortBy: 'publishedAt',
          pageSize: limit,
          domains: 'bloomberg.com,reuters.com,cnbc.com,wsj.com,ft.com,marketwatch.com,seekingalpha.com,yahoo.com',
          apiKey: NEWS_API_KEY
        },
        timeout: 10000
      });

      console.log(`  ✓ Found ${response.data.articles.length} financial articles`);
      return response.data.articles;
      
    } catch (error: any) {
      console.error(`  ✗ NewsAPI error:`, error.message);
      return [];
    }
  }

  /**
   * Get crypto news
   */
  async getCryptoNews(limit: number = 20): Promise<NewsArticle[]> {
    console.log(`📰 NewsAPI: Fetching crypto news...`);
    
    const query = 'cryptocurrency OR bitcoin OR ethereum OR crypto';
    
    try {
      const response = await axios.get<NewsResponse>(`${BASE_URL}/everything`, {
        params: {
          q: query,
          language: 'en',
          sortBy: 'publishedAt',
          pageSize: limit,
          apiKey: NEWS_API_KEY
        },
        timeout: 10000
      });

      console.log(`  ✓ Found ${response.data.articles.length} crypto articles`);
      return response.data.articles;
      
    } catch (error: any) {
      console.error(`  ✗ NewsAPI error:`, error.message);
      return [];
    }
  }

  /**
   * Get breaking news (last 6 hours)
   */
  async getBreakingNews(limit: number = 20): Promise<NewsArticle[]> {
    console.log(`📰 NewsAPI: Fetching breaking news...`);
    
    const sixHoursAgo = new Date();
    sixHoursAgo.setHours(sixHoursAgo.getHours() - 6);
    const from = sixHoursAgo.toISOString();

    try {
      const response = await axios.get<NewsResponse>(`${BASE_URL}/everything`, {
        params: {
          q: 'stocks OR market OR economy OR trading',
          language: 'en',
          sortBy: 'publishedAt',
          from,
          pageSize: limit,
          apiKey: NEWS_API_KEY
        },
        timeout: 10000
      });

      console.log(`  ✓ Found ${response.data.articles.length} breaking articles`);
      return response.data.articles;
      
    } catch (error: any) {
      console.error(`  ✗ NewsAPI error:`, error.message);
      return [];
    }
  }

  /**
   * Get news from specific sources
   */
  async getNewsFromSources(
    sources: string[] = ['bloomberg', 'reuters', 'cnbc', 'the-wall-street-journal'],
    limit: number = 20
  ): Promise<NewsArticle[]> {
    console.log(`📰 NewsAPI: Fetching from ${sources.length} sources...`);
    
    try {
      const response = await axios.get<NewsResponse>(`${BASE_URL}/everything`, {
        params: {
          sources: sources.join(','),
          language: 'en',
          sortBy: 'publishedAt',
          pageSize: limit,
          apiKey: NEWS_API_KEY
        },
        timeout: 10000
      });

      console.log(`  ✓ Found ${response.data.articles.length} articles from premium sources`);
      return response.data.articles;
      
    } catch (error: any) {
      console.error(`  ✗ NewsAPI error:`, error.message);
      return [];
    }
  }

  /**
   * Get available news sources
   */
  async getAvailableSources(category?: 'business' | 'technology'): Promise<any[]> {
    console.log(`📰 NewsAPI: Fetching available sources...`);
    
    try {
      const params: any = {
        language: 'en',
        apiKey: NEWS_API_KEY
      };

      if (category) params.category = category;

      const response = await axios.get(`${BASE_URL}/sources`, {
        params,
        timeout: 10000
      });

      console.log(`  ✓ Found ${response.data.sources.length} sources`);
      return response.data.sources;
      
    } catch (error: any) {
      console.error(`  ✗ NewsAPI error:`, error.message);
      return [];
    }
  }

  /**
   * Batch get news for multiple tickers
   */
  async getBatchTickerNews(tickers: string[], limit: number = 10): Promise<Map<string, NewsArticle[]>> {
    console.log(`\n📰 NewsAPI: Batch fetching news for ${tickers.length} tickers...\n`);
    
    const results = new Map<string, NewsArticle[]>();

    for (const ticker of tickers) {
      const news = await this.getTickerNews(ticker, undefined, limit);
      if (news.length > 0) {
        results.set(ticker, news);
      }

      // Rate limiting for free tier (100 req/day)
      await this.sleep(1000);
    }

    console.log(`\n✅ Fetched news for ${results.size}/${tickers.length} tickers\n`);
    return results;
  }

  /**
   * Analyze sentiment of article (basic)
   */
  analyzeSentiment(article: NewsArticle): 'positive' | 'negative' | 'neutral' {
    const text = `${article.title} ${article.description}`.toLowerCase();

    const positiveWords = [
      'surges', 'rallies', 'gains', 'climbs', 'rises', 'soars', 'jumps',
      'outperforms', 'beats', 'exceeds', 'strong', 'growth', 'profit',
      'success', 'positive', 'upgrade', 'bullish', 'breakthrough'
    ];

    const negativeWords = [
      'plunges', 'tumbles', 'falls', 'drops', 'declines', 'slumps', 'crashes',
      'misses', 'weak', 'loss', 'concern', 'worry', 'risk', 'fear',
      'negative', 'downgrade', 'bearish', 'warning', 'cuts'
    ];

    let positiveScore = 0;
    let negativeScore = 0;

    for (const word of positiveWords) {
      if (text.includes(word)) positiveScore++;
    }

    for (const word of negativeWords) {
      if (text.includes(word)) negativeScore++;
    }

    if (positiveScore > negativeScore) return 'positive';
    if (negativeScore > positiveScore) return 'negative';
    return 'neutral';
  }

  /**
   * Filter articles by sentiment
   */
  filterBySentiment(articles: NewsArticle[], sentiment: 'positive' | 'negative' | 'neutral'): NewsArticle[] {
    return articles.filter(article => this.analyzeSentiment(article) === sentiment);
  }

  /**
   * Get deduplicated articles (remove similar titles)
   */
  deduplicateArticles(articles: NewsArticle[]): NewsArticle[] {
    const seen = new Set<string>();
    const unique: NewsArticle[] = [];

    for (const article of articles) {
      // Normalize title for comparison
      const normalizedTitle = article.title
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(' ')
        .slice(0, 5) // First 5 words
        .join(' ');

      if (!seen.has(normalizedTitle)) {
        seen.add(normalizedTitle);
        unique.push(article);
      }
    }

    return unique;
  }

  /**
   * Check API health
   */
  async checkHealth(): Promise<boolean> {
    try {
      const articles = await this.getTopHeadlines('business', 5);
      return articles.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get usage info
   */
  getUsageInfo(): string {
    return `
NewsAPI:
- Rate Limit: 100 requests/day (FREE)
- Sources: 100+ news outlets
- Languages: 14 languages
- Categories: business, technology, general
- Cost: FREE (Developer plan)

Premium: $449/month for unlimited requests

Top Sources:
- Bloomberg, Reuters, CNBC, WSJ
- Financial Times, MarketWatch
- Seeking Alpha, Yahoo Finance
    `.trim();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default new NewsApiService();
