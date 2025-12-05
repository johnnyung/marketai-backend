export interface MarketData {
    price: number;
    change: number;
    changePercent: number;
    volume: number;
    timestamp: number;
    source: string;
}

export interface Candle {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export interface FundamentalData {
    symbol: string;
    marketCap: number;
    peRatio: number;
    pegRatio: number;
    bookValue: number;
    dividendYield: number;
    eps: number;
    revenue: number;
    profitMargin: number;
    operatingMargin: number;
    debtToEquity: number;
    beta: number;
    source: string;
}

export interface DataProvider {
    name: string;
    priority: number; // 1 = Primary, 2 = Secondary
    isHealthy(): Promise<boolean>;
    
    // Core Methods (Return null if unavailable/failed)
    getPrice(ticker: string): Promise<MarketData | null>;
    getHistory(ticker: string, days: number): Promise<Candle[] | null>;
    getFundamentals(ticker: string): Promise<FundamentalData | null>;
}

export interface NewsItem {
    id: string;
    title: string;
    summary: string;
    source: string;
    url: string;
    publishedDate: string; // ISO String
    tickers: string[];
    sentiment?: 'Positive' | 'Negative' | 'Neutral';
}
