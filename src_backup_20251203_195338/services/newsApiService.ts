import dataProviderGrid from './dataProviderGrid.js';
import { NewsItem } from '../types/dataProviderTypes.js';

/**
 * News API Service (Real Data Only)
 * Wrapper for DataProviderGrid with Legacy Support.
 */
class NewsApiService {
    
    // Core (New)
    async getTickerNews(ticker: string, limit: number = 5): Promise<NewsItem[]> {
        return await dataProviderGrid.getNews(ticker, limit);
    }

    async getBreakingNews(limit: number = 20): Promise<NewsItem[]> {
        return await dataProviderGrid.getGlobalNews(limit);
    }

    // Legacy Support (Mapped to New Logic)
    async getTopHeadlines(category: string = 'business', limit: number = 10): Promise<NewsItem[]> {
        return await this.getBreakingNews(limit);
    }

    async searchCompanyNews(ticker: string, from?: string, to?: string, limit: number = 5): Promise<NewsItem[]> {
        return await this.getTickerNews(ticker, limit);
    }

    async getFinancialNews(keywords: string[] = ['market'], limit: number = 20): Promise<NewsItem[]> {
        return await this.getBreakingNews(limit);
    }

    getUsageInfo() {
        return { status: 'Active', provider: 'DataProviderGrid' };
    }

    async checkHealth(): Promise<boolean> {
        return true;
    }
}

export default new NewsApiService();
