import fetch from 'node-fetch';

const API_KEY = process.env.NEWS_API_KEY;
const BASE_URL = 'https://newsapi.org/v2';

interface NewsArticle {
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
  urlToImage?: string;
}

/**
 * Get latest market news
 */
export async function getLatestNews(query: string = 'stock market', limit: number = 10): Promise<NewsArticle[]> {
  if (!API_KEY) {
    throw new Error('NEWS_API_KEY not configured');
  }

  const url = `${BASE_URL}/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&language=en&pageSize=${limit}&apiKey=${API_KEY}`;
  
  const response = await fetch(url);
  const data: any = await response.json();

  if (data.status === 'error') {
    throw new Error(data.message || 'News API error');
  }

  return data.articles.map((article: any) => ({
    title: article.title,
    description: article.description,
    url: article.url,
    source: article.source.name,
    publishedAt: article.publishedAt,
    urlToImage: article.urlToImage,
  }));
}

/**
 * Get news for specific company/ticker
 */
export async function getCompanyNews(company: string, limit: number = 5): Promise<NewsArticle[]> {
  return getLatestNews(company, limit);
}

/**
 * Get top business headlines
 */
export async function getTopHeadlines(category: string = 'business', limit: number = 10): Promise<NewsArticle[]> {
  if (!API_KEY) {
    throw new Error('NEWS_API_KEY not configured');
  }

  const url = `${BASE_URL}/top-headlines?country=us&category=${category}&pageSize=${limit}&apiKey=${API_KEY}`;
  
  const response = await fetch(url);
  const data: any = await response.json();

  if (data.status === 'error') {
    throw new Error(data.message || 'News API error');
  }

  return data.articles.map((article: any) => ({
    title: article.title,
    description: article.description,
    url: article.url,
    source: article.source.name,
    publishedAt: article.publishedAt,
    urlToImage: article.urlToImage,
  }));
}

export const newsService = {
  getLatestNews,
  getCompanyNews,
  getTopHeadlines,
};
