import { DataProvider, MarketData, Candle, FundamentalData, NewsItem } from '../types/dataProviderTypes.js';
import fmpService from './fmpService.js';
import tiingoService from './tiingoService.js';
import yahooFinanceService from './yahooFinanceService.js';
import newsApiService from './newsApiService.js'; // Will be refactored to be a provider/consumer

/**
 * DATA PROVIDER GRID (v113.0)
 * ---------------------------
 * Central Orchestrator for all Real-World Data.
 * Implements Waterfall Failover: FMP -> Tiingo -> Yahoo -> Null.
 */
class DataProviderGrid {
    private providers: any[] = [];

    constructor() {
        this.initializeProviders();
    }

    private initializeProviders() {
        // 1. FMP - Primary
        this.providers.push({ name: 'FMP', service: fmpService, priority: 1 });
        // 2. Tiingo - Secondary
        this.providers.push({ name: 'Tiingo', service: tiingoService, priority: 2 });
        // 3. Yahoo - Tertiary
        this.providers.push({ name: 'Yahoo', service: yahooFinanceService, priority: 3 });
    }

    public async getPrice(ticker: string): Promise<MarketData | null> {
        for (const p of this.providers) {
            try {
                if (p.name === 'FMP') {
                    const quote = await p.service.getPrice(ticker);
                    if (quote) return {
                        price: quote.price,
                        change: quote.change,
                        changePercent: quote.changesPercentage || quote.changePercent,
                        volume: quote.volume || 0,
                        timestamp: Date.now(),
                        source: 'FMP'
                    };
                }
                if (p.name === 'Tiingo') {
                    const quote = await p.service.getPrice(ticker);
                    if (quote && typeof quote.price === 'number') return {
                        price: quote.price,
                        change: quote.change || 0,
                        changePercent: quote.changePercent || 0,
                        volume: quote.volume || 0,
                        timestamp: Date.now(),
                        source: 'Tiingo'
                    };
                }
                if (p.name === 'Yahoo') {
                    const quote = await p.service.getPrice(ticker);
                    if (quote) return {
                        price: quote.price,
                        change: quote.change,
                        changePercent: quote.pct,
                        volume: 0,
                        timestamp: Date.now(),
                        source: 'Yahoo'
                    };
                }
            } catch (err) { continue; }
        }
        return null;
    }

    public async getHistory(ticker: string, days: number = 250): Promise<Candle[] | null> {
        try {
            const fmpHist = await fmpService.getDailyCandles(ticker, days);
            if (fmpHist && fmpHist.length > 0) return fmpHist.map((c: any) => ({
                date: c.date,
                open: c.open,
                high: c.high,
                low: c.low,
                close: c.close,
                volume: c.volume
            }));
        } catch (e) { /* Failover logic here if needed */ }
        return null;
    }

    public async getFundamentals(ticker: string): Promise<FundamentalData | null> {
        try {
            const profile = await fmpService.getCompanyProfile(ticker);
            const ratios = await fmpService.getFinancialRatios(ticker);
            const metrics = await fmpService.getKeyMetrics(ticker);

            if (profile) {
                const m = metrics && metrics[0] ? metrics[0] : {};
                const r = ratios && ratios[0] ? ratios[0] : {};
                
                return {
                    symbol: profile.symbol,
                    marketCap: profile.mktCap || 0,
                    peRatio: m.peRatio || 0,
                    pegRatio: m.pegRatio || 0,
                    bookValue: m.bookValuePerShare || 0,
                    dividendYield: m.dividendYield || 0,
                    eps: m.netIncomePerShare || 0,
                    revenue: m.revenuePerShare * profile.price || 0,
                    profitMargin: r.netProfitMargin || 0,
                    operatingMargin: r.operatingProfitMargin || 0,
                    debtToEquity: r.debtEquityRatio || 0,
                    beta: profile.beta || 1,
                    source: 'FMP'
                };
            }
        } catch (e) { /* Ignore */ }
        return null;
    }

    /**
     * UNIFIED NEWS FETCH
     * Aggregates news from available providers.
     */
    public async getNews(ticker: string, limit: number = 10): Promise<NewsItem[]> {
        // 1. Try FMP News
        try {
            const fmpNews = await fmpService.getCompanyNews(ticker, limit);
            if (fmpNews && fmpNews.length > 0) {
                return fmpNews.map((n: any) => ({
                    id: String(n.id || Date.now()),
                    title: n.headline || n.title,
                    summary: n.summary || n.text || '',
                    source: n.source || 'FMP',
                    url: n.url,
                    publishedDate: new Date(n.datetime * 1000).toISOString(),
                    tickers: [ticker],
                    sentiment: 'Neutral' // FMP doesn't give sentiment by default
                }));
            }
        } catch (e) { console.warn('[Grid] FMP News failed', e.message); }

        // 2. Fallback to generic NewsAPI or Yahoo Scraper would go here
        // For now, we return empty array to avoid mocks.
        return [];
    }

    public async getGlobalNews(limit: number = 20): Promise<NewsItem[]> {
        try {
            const news = await fmpService.getMarketNews(limit);
             if (news && news.length > 0) {
                return news.map((n: any) => ({
                    id: String(n.id || Date.now()),
                    title: n.headline || n.title,
                    summary: n.summary || n.text || '',
                    source: n.source || 'FMP',
                    url: n.url,
                    publishedDate: new Date(n.datetime * 1000).toISOString(),
                    tickers: [],
                    sentiment: 'Neutral'
                }));
             }
        } catch (e) { /* Ignore */ }
        return [];
    }
}

export default new DataProviderGrid();
