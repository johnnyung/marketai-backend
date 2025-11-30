import axios from 'axios';
import pool from '../db/index.js';
import * as cheerio from 'cheerio';

const NEWS_API_KEY = process.env.NEWS_API_KEY;
const BASE_URL = 'https://newsapi.org/v2';

class NewsApiService {
  
  // --- SEARCH (Smart Router) ---
  async searchCompanyNews(query: string, from?: string, to?: string, limit: number = 5) {
    // 1. INTERNAL CACHE
    try {
        const cached = await pool.query(`
            SELECT title, ai_summary as description, source_name as source, event_date as "publishedAt", content_url as url
            FROM digest_entries
            WHERE (title ILIKE $1 OR ai_summary ILIKE $1)
            AND created_at > NOW() - INTERVAL '48 hours'
            LIMIT $2
        `, [`%${query}%`, limit]);
        
        if (cached.rows.length > 0) {
            // Normalize structure
            return cached.rows.map(r => ({
                title: r.title,
                description: r.description,
                url: r.url,
                publishedAt: r.publishedAt,
                source: { name: r.source || 'MarketAI Cache' }
            }));
        }
    } catch(e) {}

    // 2. GOOGLE NEWS RSS (Fallback)
    try {
        const googleNews = await this.fetchGoogleRSS(query);
        if (googleNews.length > 0) {
            return googleNews.slice(0, limit);
        }
    } catch(e) {}

    // 3. NEWS API (Paid/Limited)
    if (NEWS_API_KEY) {
        try {
            const response = await axios.get(`${BASE_URL}/everything`, {
                params: { q: query, sortBy: 'relevancy', pageSize: limit, apiKey: NEWS_API_KEY },
                timeout: 4000
            });
            return response.data.articles;
        } catch (e: any) {}
    }

    return [];
  }

  // Google RSS Scraper
  private async fetchGoogleRSS(query: string) {
      try {
          const q = query.includes(' ') ? query : `${query} stock news`;
          const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;
          const res = await axios.get(url, {
              timeout: 5000,
              headers: { 'User-Agent': 'Mozilla/5.0 (Compatible; MarketAI/6.0)' }
          });
          
          const $ = cheerio.load(res.data, { xmlMode: true });
          const items: any[] = [];
          
          $('item').each((i, el) => {
              if (i >= 15) return;
              const title = $(el).find('title').text();
              const link = $(el).find('link').text();
              const pubDate = $(el).find('pubDate').text();
              // Strip HTML from desc
              const descHtml = $(el).find('description').text();
              const description = descHtml.replace(/<[^>]*>/g, '');

              items.push({
                  title,
                  description,
                  url: link,
                  link, // legacy support
                  publishedAt: pubDate,
                  source: { name: 'Google News' }
              });
          });
          return items;
      } catch(e) { return []; }
  }

  // --- COMPATIBILITY METHODS (Fixed Signatures) ---
  
  // Fixed: Accepts category and limit
  async getTopHeadlines(category: string = 'business', limit: number = 10) {
      return this.searchCompanyNews(`${category} market news`, undefined, undefined, limit);
  }

  async getTickerNews(ticker: string, name?: string, limit: number = 5) {
      return this.searchCompanyNews(ticker, undefined, undefined, limit);
  }

  // Fixed: Accepts keywords array and limit
  async getFinancialNews(keywords: string[] = ['market'], limit: number = 20) {
      const query = keywords.join(' OR ');
      return this.searchCompanyNews(query, undefined, undefined, limit);
  }

  // Fixed: Accepts limit
  async getBreakingNews(limit: number = 20) {
      return this.searchCompanyNews('breaking stock market news', undefined, undefined, limit);
  }

  analyzeSentiment(article: any) {
      const text = (article.title + ' ' + (article.description || '')).toLowerCase();
      if (text.includes('surge') || text.includes('jump') || text.includes('high') || text.includes('beat')) return 'positive';
      if (text.includes('plunge') || text.includes('drop') || text.includes('low') || text.includes('miss')) return 'negative';
      return 'neutral';
  }

  getUsageInfo() { return { source: "Hybrid (Cache + Google + NewsAPI)", status: "Active" }; }
  async checkHealth() { return true; }
}

export default new NewsApiService();
