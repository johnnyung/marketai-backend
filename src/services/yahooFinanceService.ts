import axios from 'axios';

class YahooFinanceService {
  // Uses the stable query2 API instead of scraping HTML
  // This is much faster and less likely to be blocked
  async getPrice(ticker: string): Promise<{ price: number, change: number, pct: number } | null> {
    try {
      // Handle Indices for Yahoo (^GSPC, ^VIX)
      let symbol = ticker;
      if (['SPY', 'QQQ', 'VIX'].includes(ticker)) symbol = ticker; // Yahoo likes standard tickers
      if (ticker === 'VIX') symbol = '^VIX';

      const url = `https://query2.finance.yahoo.com/v8/finance/quote?symbols=${symbol}`;
      
      const res = await axios.get(url, {
        timeout: 4000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      const result = res.data?.quoteResponse?.result?.[0];
      
      if (result) {
        // Prefer regular market price, fall back to pre/post if needed
        const price = result.regularMarketPrice || result.postMarketPrice || result.preMarketPrice;
        const change = result.regularMarketChange || 0;
        const pct = result.regularMarketChangePercent || 0;

        if (price && price > 0) {
             return { price, change, pct };
        }
      }
      
      return null;
    } catch (error) {
      return null; // Silent fail, will try next source
    }
  }
}

export default new YahooFinanceService();
