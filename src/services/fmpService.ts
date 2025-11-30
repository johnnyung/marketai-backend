import axios from 'axios';
import historicalDataService from './historicalDataService.js';
import { TechnicalMath } from '../utils/mathUtils.js';

const STABLE_BASE = 'https://financialmodelingprep.com/stable';
const V3_BASE = 'https://financialmodelingprep.com/api/v3';

class FmpService {
  
  private getApiKey(): string | undefined {
      return process.env.FMP_API_KEY;
  }

  private async fetch(endpoint: string, params: string = '', version: string = 'stable') {
      const apiKey = this.getApiKey();
      if (!apiKey) return null;
      
      const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
      const separator = endpoint.includes('?') ? '&' : '?';
      const baseUrl = version === 'v3' ? V3_BASE : STABLE_BASE;
      const url = `${baseUrl}/${cleanEndpoint}${separator}apikey=${apiKey}${params}`;
      
      try {
          const res = await axios.get(url, { timeout: 10000 }); // Higher timeout for large datasets
          if (res.data && !res.data['Error Message'] && !res.data['error']) {
             if (Array.isArray(res.data) && res.data.length === 0) return [];
             return res.data;
          }
      } catch(e: any) {
          // console.error(`FMP Fetch Error ${endpoint}: ${e.message}`);
      }
      return null;
  }

  async getPrice(symbol: string) {
      const ticker = symbol.replace('-USD', 'USD').replace('-', '');
      const data = await this.fetch(`quote?symbol=${ticker}`);
      return Array.isArray(data) ? data[0] : null;
  }

  async getBatchPrices(symbols: string[]) {
      const results = [];
      for (const s of symbols) {
          const ticker = s.replace('-USD', 'USD').replace('-', '');
          const data = await this.fetch(`quote?symbol=${ticker}`);
          if (Array.isArray(data) && data.length > 0) {
              results.push(data[0]);
          }
          await new Promise(r => setTimeout(r, 50));
      }
      return results;
  }

  async getCompanyProfile(t: string) { const d = await this.fetch(`profile?symbol=${t}`); return Array.isArray(d) ? d[0] : null; }
  async getAnalystEstimates(t: string) { const d = await this.fetch(`analyst-estimates?symbol=${t}&limit=1`); return Array.isArray(d) ? d[0] : null; }
  async getPriceTargets(t: string) { const d = await this.fetch(`price-target?symbol=${t}`); return Array.isArray(d) ? d : []; }
  
  async getEarningsCalendar(days: number) {
      const from = new Date();
      const to = new Date();
      to.setDate(to.getDate() + days);
      const data = await this.fetch('earning_calendar', `&from=${from.toISOString().split('T')[0]}&to=${to.toISOString().split('T')[0]}`);
      return Array.isArray(data) ? data : [];
  }
  
  async getIncomeStatement(t: string, period='annual', limit=5) { return this.fetch(`income-statement?symbol=${t}&period=${period}&limit=${limit}`); }
  async getBalanceSheet(t: string, period='annual', limit=5) { return this.fetch(`balance-sheet-statement?symbol=${t}&period=${period}&limit=${limit}`); }
  async getCashFlowStatement(t: string, period='annual', limit=5) { return this.fetch(`cash-flow-statement?symbol=${t}&period=${period}&limit=${limit}`); }
  async getFinancialRatios(t: string, period='annual', limit=5) { return this.fetch(`ratios-ttm?symbol=${t}`); }

  async getCompleteFundamentals(ticker: string) {
      const [profile, incomeStatement, balanceSheet, cashFlow, ratios] = await Promise.all([
          this.getCompanyProfile(ticker),
          this.getIncomeStatement(ticker),
          this.getBalanceSheet(ticker),
          this.getCashFlowStatement(ticker),
          this.getFinancialRatios(ticker)
      ]);
      return { profile, incomeStatement, balanceSheet, cashFlow, ratios };
  }

  calculateKeyMetrics(fundamentals: any) {
       const curr = (fundamentals.ratios && fundamentals.ratios[0]) || {};
       return {
           profitability: { netMargin: curr.netProfitMarginTTM || 0, grossMargin: curr.grossProfitMarginTTM || 0, operatingMargin: curr.operatingProfitMarginTTM || 0, roe: curr.returnOnEquityTTM || 0, roa: curr.returnOnAssetsTTM || 0 },
           liquidity: { currentRatio: curr.currentRatioTTM || 0, quickRatio: curr.quickRatioTTM || 0, cashRatio: curr.cashRatioTTM || 0 },
           leverage: { debtToEquity: curr.debtEquityRatioTTM || 0, debtRatio: curr.debtRatioTTM || 0, interestCoverage: curr.interestCoverageTTM || 0 },
           efficiency: { assetTurnover: curr.assetTurnoverTTM || 0, inventoryTurnover: curr.inventoryTurnoverTTM || 0, receivablesTurnover: curr.receivablesTurnoverTTM || 0 },
           growth: {},
           valuation: { pe: curr.peRatioTTM || 0, pb: curr.priceToBookRatioTTM || 0, ps: curr.priceToSalesRatioTTM || 0, priceToFCF: curr.priceToFreeCashFlowsRatioTTM || 0 }
       };
  }

  async getTreasuryRates() { return (await this.fetch('treasury', '&from=2023-01-01&to=2025-12-31')) || []; }
  async getEconomicIndicator(name: string) { return (await this.fetch('economic_indicator', `&name=${name}&limit=50`)) || []; }
  async get13F(cik: string) { return (await this.fetch(`13f?cik=${cik}&limit=50`)) || []; }
  async getInsiderFeed() { return (await this.fetch('insider-trading', '&limit=100')) || []; }
  async getEtfHoldings(etf: string) { return (await this.fetch(`etf-holder?symbol=${etf}`)) || []; }
  async getStockSplits(symbol: string) { return (await this.fetch(`historical-price-full/stock_split/${symbol}`))?.historical || []; }

  // --- NEW v101: Option Chain Access ---
  async getOptionChain(symbol: string) {
      // V3 endpoint is standard for option chains
      return await this.fetch(`options/chain?symbol=${symbol}`, '', 'v3');
  }

  async getRSI(ticker: string) {
      try {
          const history = await historicalDataService.getStockHistory(ticker, 60);
          if (!history || history.length < 20) return 50;
          const prices = history.map(h => h.price);
          return TechnicalMath.calculateRSI(prices, 14) || 50;
      } catch(e) { return 50; }
  }

  async getSMA(ticker: string, period: number) {
      try {
          const history = await historicalDataService.getStockHistory(ticker, period + 20);
          if (!history || history.length < period) return 0;
          const prices = history.map(h => h.price);
          return TechnicalMath.calculateSMA(prices, period) || 0;
      } catch(e) { return 0; }
  }
  
  async getIntraday(ticker: string) {
      const data = await this.fetch(`historical-chart/5min/${ticker}`);
      return Array.isArray(data) ? data : [];
  }

  async checkApiHealth() { const q = await this.getPrice('AAPL'); return !!q; }
  async checkConnection() {
      const start = Date.now();
      const quote = await this.getPrice('AAPL');
      return { latency: Date.now() - start, success: !!quote, config: !!this.getApiKey(), message: quote ? `Connected` : 'Failed' };
  }
  getUsageInfo() { return { source: "FMP Stable", status: "Active" }; }
}

export default new FmpService();
