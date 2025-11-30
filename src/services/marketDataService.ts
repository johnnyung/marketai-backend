import axios from 'axios';
import tiingoService from './tiingoService.js';       // WIRED
import yahooFinanceService from './yahooFinanceService.js'; // WIRED

interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  source: string;
  timestamp?: number;
}

class MarketDataService {
  private cache: Map<string, StockQuote> = new Map();
  private CACHE_TTL = 60 * 1000; // 1 Minute Cache

  private getFmpKey(): string | undefined { return process.env.FMP_API_KEY; }

  async getStockPrice(rawSymbol: string): Promise<StockQuote | null> {
    const symbol = rawSymbol.toUpperCase().trim();
    
    // 1. CHECK CACHE
    const cached = this.cache.get(symbol);
    if (cached && (Date.now() - (cached.timestamp || 0) < this.CACHE_TTL)) {
        return cached;
    }

    // Normalize Tickers
    const isCrypto = symbol.includes('-USD') || ['BTC', 'ETH', 'SOL', 'DOGE'].includes(symbol);
    let fmpSymbol = symbol;
    let yahooSymbol = symbol;

    if (isCrypto) {
        const clean = symbol.replace('-USD', '').replace('USD', '');
        fmpSymbol = `${clean}USD`;
        yahooSymbol = `${clean}-USD`;
    }

    let quote: StockQuote | null = null;
    const fmpKey = this.getFmpKey();

    // 2. FMP STABLE (Primary)
    if (fmpKey) {
        try {
            const url = `https://financialmodelingprep.com/stable/quote?symbol=${fmpSymbol}&apikey=${fmpKey}`;
            const res = await axios.get(url, { timeout: 5000 });
            
            if (Array.isArray(res.data) && res.data.length > 0) {
                const d = res.data[0];
                quote = {
                    symbol,
                    price: d.price,
                    change: d.change,
                    changePercent: d.changesPercentage,
                    volume: d.volume,
                    source: 'FMP',
                    timestamp: Date.now()
                };
            }
        } catch (e: any) {}
    }

    // 3. TIINGO (Backup) - Now Explicitly Wired
    if (!quote && !isCrypto) {
        try {
            const tPrice = await tiingoService.getPrice(symbol);
            if (tPrice && tPrice.price > 0) {
                quote = {
                    symbol,
                    price: tPrice.price,
                    change: tPrice.change || 0,
                    changePercent: tPrice.changePercent || 0,
                    volume: tPrice.volume,
                    source: 'Tiingo',
                    timestamp: Date.now()
                };
            }
        } catch (e) {}
    }

    // 4. YAHOO (Last Resort) - Now Explicitly Wired
    if (!quote) {
        try {
            const yData = await yahooFinanceService.getPrice(yahooSymbol);
            if (yData) {
                quote = {
                    symbol,
                    price: yData.price,
                    change: yData.change,
                    changePercent: yData.pct,
                    source: 'Yahoo',
                    timestamp: Date.now()
                };
            }
        } catch (e) {}
    }

    // SAVE TO CACHE
    if (quote) {
        this.cache.set(symbol, quote);
        return quote;
    }
    return null;
  }

  async getMultiplePrices(symbols: string[]) {
    const map = new Map();
    const uniqueSymbols = [...new Set(symbols.map(s => s.toUpperCase().trim()))];
    
    for (const s of uniqueSymbols) {
        const quote = await this.getStockPrice(s);
        if(quote) map.set(s, quote);
        await new Promise(r => setTimeout(r, 50));
    }
    return map;
  }
}

export default new MarketDataService();
