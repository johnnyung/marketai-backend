import axios from 'axios';
import { Candle } from '../types/dataProviderTypes.js';

/**
 * FMP Service (Restored & Stable-Aligned)
 * ---------------------------------------
 * Base URL: https://financialmodelingprep.com/stable
 * Provides all methods required by the backend architecture.
 */
class FmpService {
  private apiKey: string;
  private baseUrl = 'https://financialmodelingprep.com/stable';

  public capabilities: Record<string, 'UNKNOWN' | 'OK' | 'UNAVAILABLE'> = {
    quote: 'UNKNOWN',
    profile: 'UNKNOWN',
    historical: 'UNKNOWN',
    intraday: 'UNKNOWN',
    financials: 'UNKNOWN',
    analyst: 'UNKNOWN',
    institutional: 'UNKNOWN',
    insider: 'UNKNOWN',
    news: 'UNKNOWN',
    economic: 'UNKNOWN',
    options: 'UNKNOWN',
    index: 'UNKNOWN'
  };

  public lastDebug: any = {};

  constructor() {
    this.apiKey = process.env.FMP_API_KEY || '';
  }

  private async fetchRaw(path: string, category: string = 'general'): Promise<any> {
    if (this.capabilities[category] === 'UNAVAILABLE') return null;
    if (!this.apiKey) return null;
    
    try {
      // Path construction
      const cleanPath = path.startsWith('/') ? path.substring(1) : path;
      const separator = cleanPath.includes('?') ? '&' : '?';
      const url = `${this.baseUrl}/${cleanPath}${separator}apikey=${this.apiKey}`;
      
      const masked = url.replace(this.apiKey, 'HIDDEN');
      this.lastDebug = { url: masked, timestamp: new Date().toISOString() };

      const response = await axios.get(url, { timeout: 10000 });
      this.lastDebug.status = response.status;

      if (response.status !== 200) return null;

      const data = response.data;

      if (data && data['Error Message']) {
          console.warn(`[FMP] API Error: ${data['Error Message']}`);
          this.capabilities[category] = 'UNAVAILABLE';
          this.lastDebug.error = data['Error Message'];
          return null;
      }

      if (Array.isArray(data) && data.length === 0) return [];

      this.capabilities[category] = 'OK';
      return data;

    } catch (error: any) {
      this.lastDebug.error = error.message;
      if (error.response?.status === 403 || error.response?.status === 404) {
          this.capabilities[category] = 'UNAVAILABLE';
      }
      return null;
    }
  }

  // --- 1. MARKET DATA ---
  async getPrice(ticker: string): Promise<any> {
    const data = await this.fetchRaw(`quote?symbol=${ticker}`, 'quote');
    return data && data[0] ? data[0] : null;
  }
  
  async getQuote(ticker: string): Promise<any> { return this.getPrice(ticker); }

  async getBatchPrices(tickers: string[]): Promise<any[]> {
    if (!tickers.length) return [];
    return await this.fetchRaw(`quote?symbol=${tickers.join(',')}`, 'quote') || [];
  }

  async getDailyCandles(ticker: string, limit: number = 30): Promise<Candle[]> {
    const data = await this.fetchRaw(`historical-price-eod/light?symbol=${ticker}&timeseries=${limit}`, 'historical');
    return data && data.historical ? data.historical : [];
  }

  async getIntraday(ticker: string, interval: string = '5min'): Promise<any[]> {
    return await this.fetchRaw(`historical-chart/${interval}?symbol=${ticker}`, 'intraday') || [];
  }

  // --- 2. COMPANY ---
  async getCompanyProfile(ticker: string): Promise<any> {
    const data = await this.fetchRaw(`profile?symbol=${ticker}`, 'profile');
    return data && data[0] ? data[0] : null;
  }

  // --- 3. FINANCIALS ---
  async getFinancialRatios(ticker: string, period: string = 'annual', limit: number = 1): Promise<any> {
    return await this.fetchRaw(`ratios-ttm?symbol=${ticker}`, 'financials') || [];
  }

  async getKeyMetrics(ticker: string, limit: number = 1): Promise<any> {
    return await this.fetchRaw(`key-metrics-ttm?symbol=${ticker}`, 'financials') || [];
  }

  async getIncomeStatement(ticker: string, period: string = 'annual', limit: number = 5): Promise<any[]> {
    return await this.fetchRaw(`income-statement?symbol=${ticker}&period=${period}&limit=${limit}`, 'financials') || [];
  }

  async getBalanceSheet(ticker: string, period: string = 'annual', limit: number = 5): Promise<any[]> {
    return await this.fetchRaw(`balance-sheet-statement?symbol=${ticker}&period=${period}&limit=${limit}`, 'financials') || [];
  }

  async getCashFlowStatement(ticker: string, period: string = 'annual', limit: number = 5): Promise<any[]> {
    return await this.fetchRaw(`cash-flow-statement?symbol=${ticker}&period=${period}&limit=${limit}`, 'financials') || [];
  }

  // --- 4. ANALYSTS & NEWS ---
  async getAnalystEstimates(ticker: string): Promise<any[]> {
    return await this.fetchRaw(`analyst-estimates?symbol=${ticker}`, 'analyst') || [];
  }

  async getPriceTargets(ticker: string): Promise<any[]> {
    return await this.fetchRaw(`analyst-stock-price-target?symbol=${ticker}`, 'analyst') || [];
  }

  async getCompanyNews(ticker: string, limit: number = 10): Promise<any[]> {
    return await this.fetchRaw(`stock-news?tickers=${ticker}&limit=${limit}`, 'news') || [];
  }

  async getMarketNews(limit: number = 20): Promise<any[]> {
    return await this.fetchRaw(`stock-news?limit=${limit}`, 'news') || [];
  }

  // --- 5. INSIDER / INSTITUTIONAL ---
  async getInsiderTrades(ticker: string): Promise<any[]> {
    return await this.fetchRaw(`insider-trading?symbol=${ticker}&limit=100`, 'insider') || [];
  }
  
  async getInsiderFeed(): Promise<any[]> {
    return await this.fetchRaw(`insider-trading?limit=50`, 'insider') || [];
  }

  async getInstitutionalHolders(ticker: string): Promise<any[]> {
    return await this.fetchRaw(`institutional-ownership?symbol=${ticker}`, 'institutional') || [];
  }

  async getEtfHoldings(ticker: string): Promise<any[]> {
    return await this.fetchRaw(`etf-holder?symbol=${ticker}`, 'institutional') || [];
  }
  
  async get13F(cik: string): Promise<any[]> {
    return await this.fetchRaw(`13f?cik=${cik}`, 'institutional') || [];
  }

  // --- 6. MACRO / OPTIONS ---
  async getOptionChain(ticker: string): Promise<any[]> {
    return await this.fetchRaw(`options-chain?symbol=${ticker}`, 'options') || [];
  }

  async getEconomicIndicator(name: string): Promise<any[]> {
    return await this.fetchRaw(`economic?name=${encodeURIComponent(name)}`, 'economic') || [];
  }
  
  async getEconomicData(name: string): Promise<any[]> { return this.getEconomicIndicator(name); }
  async getTreasuryRates(): Promise<any[]> { return this.getEconomicIndicator('10Y'); }

  // --- 7. LISTS ---
  async getSP500Constituents(): Promise<any[]> {
    // PATH TRAVERSAL to v3 fallback if stable is 404/403
    return await this.fetchRaw('sp500-constituent', 'index') || [];
  }
  
  async getSP500List(): Promise<any[]> { return this.getSP500Constituents(); }

  // --- 8. TECHNICALS ---
  async getRSI(ticker: string, period: number = 14): Promise<any[]> {
    return await this.fetchRaw(`technical-indicator/rsi?symbol=${ticker}&period=${period}`, 'technical') || [];
  }

  async getSMA(ticker: string, period: number = 50): Promise<any[]> {
    return await this.fetchRaw(`technical-indicator/sma?symbol=${ticker}&period=${period}`, 'technical') || [];
  }

  // --- UTILS ---
  getCapabilities() { return this.capabilities; }

  async getCompleteFundamentals(ticker: string): Promise<any> {
    const [profile, metrics, ratios, income] = await Promise.all([
      this.getCompanyProfile(ticker),
      this.getKeyMetrics(ticker),
      this.getFinancialRatios(ticker),
      this.getIncomeStatement(ticker)
    ]);
    return { profile, metrics, ratios, income };
  }

  async checkConnection(): Promise<{ success: boolean; message: string }> {
      const res = await this.getPrice('AAPL');
      return { success: !!res, message: res ? 'Connected' : 'Failed' };
  }

  // --- NEW Stable Endpoints (Ultimate Plan Additions) ---
  async getSP500Stable(): Promise<any[]> {
      return await this.fetchRaw(`sp500-constituent`, 'index') || [];
  }

  async getNasdaqConstituents(): Promise<any[]> {
      return await this.fetchRaw(`nasdaq-constituent`, 'index') || [];
  }

  async getDowJonesConstituents(): Promise<any[]> {
      return await this.fetchRaw(`dowjones-constituent`, 'index') || [];
  }

  // Stable DCF
  async getDiscountedCashFlow(symbol: string): Promise<any[]> {
      return await this.fetchRaw(`discounted-cash-flow?symbol=${symbol}`, 'fundamentals') || [];
  }

  // Stable Press Releases
  async getPressReleases(symbol: string): Promise<any[]> {
      return await this.fetchRaw(`press-releases?symbol=${symbol}`, 'news') || [];
  }

  // Stable Enterprise Values
  async getEnterpriseValues(symbol: string): Promise<any[]> {
      return await this.fetchRaw(`enterprise-values?symbol=${symbol}`, 'fundamentals') || [];
  }

  // Stable Crypto
  async getCryptoPrice(symbol: string): Promise<any[]> {
      return await this.fetchRaw(`quote?symbol=${symbol}`, 'crypto') || [];
  }

  // Stable Intraday helper (5min)
  async getIntraday5Min(symbol: string, limit: number = 50): Promise<any[]> {
    // Uses: /stable/historical-chart/5min?symbol=...
    const data = await this.fetchRaw(`historical-chart/5min?symbol=${symbol}`, 'intraday') || [];
    if (!Array.isArray(data)) return [];
    // FMP returns newest first; normalize to oldest → newest
    const sorted = [...data].sort((a: any, b: any) => {
      const ta = new Date(a.date || a.timestamp || a.label || a.time || 0).getTime();
      const tb = new Date(b.date || b.timestamp || b.label || b.time || 0).getTime();
      return ta - tb;
    });
    return sorted.slice(-limit);
  }
}

export default new FmpService();
