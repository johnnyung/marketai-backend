import axios from 'axios';

const FMP_KEY = process.env.FMP_API_KEY;
const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
];

class HistoricalDataService {
  
  // 1. Get Crypto History (Supports Lookback)
  async getCryptoHistory(symbol: string, days: number = 90) {
    // STRATEGY A: FMP (Primary)
    if (FMP_KEY) {
        try {
            const ticker = `${symbol.toUpperCase()}USD`;
            const url = `https://financialmodelingprep.com/stable/historical-price-full/${ticker}?apikey=${FMP_KEY}`;
            const res = await axios.get(url, { timeout: 5000 });
            
            if (res.data && res.data.historical) {
                return res.data.historical.slice(0, days).map((p: any) => ({
                    date: new Date(p.date),
                    price: p.close
                })).reverse();
            }
        } catch (e) { /* Fallback */ }
    }
    
    // STRATEGY B: CoinGecko
    try {
        await new Promise(r => setTimeout(r, 2000));
        const clean = symbol.toUpperCase().replace('-USD', '');
        const idMap: Record<string, string> = { 'BTC': 'bitcoin', 'ETH': 'ethereum', 'SOL': 'solana', 'XRP': 'ripple', 'ADA': 'cardano', 'DOGE': 'dogecoin' };
        const id = idMap[clean] || clean.toLowerCase();
        const url = `https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=${days}&interval=daily`;
        const res = await axios.get(url, { timeout: 8000 });
        if (res.data.prices) {
            return res.data.prices.map((p: any[]) => ({ date: new Date(p[0]), price: p[1] }));
        }
    } catch (e) {}

    return [];
  }

  // 2. Get Stock History (Supports Lookback)
  async getStockHistory(symbol: string, days: number = 90) {
    const ticker = symbol.toUpperCase().replace('.', '-');

    // STRATEGY A: FMP
    if (FMP_KEY) {
        try {
            const url = `https://financialmodelingprep.com/stable/historical-price-full/${ticker}?apikey=${FMP_KEY}`;
            const res = await axios.get(url, { timeout: 5000 });
            if (res.data.historical) {
                return res.data.historical.slice(0, days).map((p: any) => ({
                    date: new Date(p.date),
                    price: p.close
                })).reverse();
            }
        } catch (e) {}
    }

    // STRATEGY B: Yahoo Finance
    try {
        const end = Math.floor(Date.now() / 1000);
        const start = end - (days * 24 * 60 * 60);
        const url = `https://query2.finance.yahoo.com/v8/finance/chart/${ticker}?period1=${start}&period2=${end}&interval=1d`;
        const agent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
        
        const res = await axios.get(url, { headers: { 'User-Agent': agent }, timeout: 5000 });
        const result = res.data?.chart?.result?.[0];
        
        if (result && result.timestamp && result.indicators?.quote?.[0]) {
            const quotes = result.indicators.quote[0];
            return result.timestamp.map((t: number, i: number) => ({
                date: new Date(t * 1000),
                price: quotes.close[i] || quotes.open[i]
            })).filter((d: any) => d.price);
        }
    } catch (e) {}
    
    return [];
  }

  async getPriceHistory(symbol: string, days: number = 90) {
      const isCrypto = symbol.includes('-USD') || ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE'].some(c => symbol.includes(c));
      if (isCrypto) return this.getCryptoHistory(symbol, days);
      return this.getStockHistory(symbol, days);
  }
}

export default new HistoricalDataService();
