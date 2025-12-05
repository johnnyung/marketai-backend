import axios from 'axios';

const TIINGO_KEY = process.env.TIINGO_API_KEY;

class TiingoService {
  private spyCache: { data: number[]; timestamp: number } | null = null;

  async getPrice(ticker: string) {
    if (!TIINGO_KEY) return null;
    
    // Normalize ticker
    let symbol = ticker.replace('-USD', ''); // Tiingo crypto format is different, but we mostly use IEX for stocks
    
    const url = `https://api.tiingo.com/iex/${symbol}?token=${TIINGO_KEY}`;
    
    try {
        const res = await axios.get(url, { timeout: 5000 });
        if (res.data && res.data.length > 0) {
            const d = res.data[0];
            return {
                price: d.last || d.tngoLast || d.prevClose,
                change: (d.last || d.prevClose) - (d.open || d.prevClose),
                changePercent: 0, // Tiingo IEX often lacks % change on this endpoint
                volume: d.volume,
                source: 'Tiingo IEX',
                timestamp: Date.now()
            };
        }
    } catch(e: any) {
        // console.error(`Tiingo Error (${ticker}): ${e.message}`);
    }
    return null;
  }

  // --- STRESS TESTING METRICS ---
  async getStressMetrics(ticker: string): Promise<{ beta: number; maxDrawdown: number } | null> {
      if (!TIINGO_KEY) return null;
      try {
          const [stockHist, spyHist] = await Promise.all([this.fetchHistory(ticker), this.getSpyHistory()]);
          if (stockHist.length < 200 || spyHist.length < 200) return null;

          const stockReturns = this.calculateReturns(stockHist);
          const spyReturns = this.calculateReturns(spyHist);
          const beta = this.calculateBeta(stockReturns, spyReturns);
          const maxDrawdown = this.calculateMaxDrawdown(stockHist);

          return { beta, maxDrawdown };
      } catch (e) { return null; }
  }

  private async fetchHistory(ticker: string) {
      const today = new Date();
      const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
      const startDate = oneYearAgo.toISOString().split('T')[0];
      const url = `https://api.tiingo.com/tiingo/daily/${ticker}/prices?startDate=${startDate}&token=${TIINGO_KEY}`;
      const res = await axios.get(url, { timeout: 8000 });
      return res.data.map((d: any) => d.adjClose || d.close);
  }

  private async getSpyHistory() {
      if (this.spyCache && Date.now() - this.spyCache.timestamp < 3600000) return this.spyCache.data;
      const data = await this.fetchHistory('SPY');
      this.spyCache = { data, timestamp: Date.now() };
      return data;
  }

  private calculateReturns(prices: number[]) {
      const returns = [];
      for (let i = 1; i < prices.length; i++) returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
      return returns;
  }

  private calculateBeta(stockReturns: number[], marketReturns: number[]) {
      const n = Math.min(stockReturns.length, marketReturns.length);
      const stock = stockReturns.slice(-n);
      const market = marketReturns.slice(-n);
      const avgStock = stock.reduce((a, b) => a + b, 0) / n;
      const avgMarket = market.reduce((a, b) => a + b, 0) / n;
      let covariance = 0;
      let variance = 0;
      for (let i = 0; i < n; i++) {
          covariance += (stock[i] - avgStock) * (market[i] - avgMarket);
          variance += Math.pow(market[i] - avgMarket, 2);
      }
      return variance === 0 ? 1 : covariance / variance;
  }

  private calculateMaxDrawdown(prices: number[]) {
      let maxPrice = 0;
      let maxDrawdown = 0;
      for (const price of prices) {
          if (price > maxPrice) maxPrice = price;
          const drawdown = (price - maxPrice) / maxPrice;
          if (drawdown < maxDrawdown) maxDrawdown = drawdown;
      }
      return maxDrawdown;
  }
}

export default new TiingoService();
