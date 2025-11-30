import axios from 'axios';

const FMP_KEY = process.env.FMP_API_KEY;
const TIINGO_KEY = process.env.TIINGO_API_KEY;

// In-memory cache
const TICKER_SET = new Set<string>();

// Backup list of top ~50 tickers to ensure system never runs empty
const BACKUP_TICKERS = [
  'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META', 'TSLA', 'BRK.B', 'LLY', 'AVGO', 'JPM', 'V', 'TSM',
  'UNH', 'WMT', 'MA', 'XOM', 'JNJ', 'PG', 'HD', 'COST', 'ABBV', 'MRK', 'KO', 'PEP', 'BAC', 'AMD',
  'NFLX', 'CRM', 'ADBE', 'CVX', 'WFC', 'TMO', 'LIN', 'ACN', 'MCD', 'DIS', 'CSCO', 'ABT', 'INTC',
  'INTU', 'ORCL', 'CMCSA', 'VZ', 'PFE', 'AMAT', 'UBER', 'NKE', 'IBM', 'PM', 'GE', 'ISRG', 'TXN',
  'NOW', 'SPY', 'QQQ', 'IWM', 'DIA', 'GLD', 'SLV', 'TLT', 'TQQQ', 'SQQQ', 'SOXL', 'ARKK', 'COIN',
  'MSTR', 'MARA', 'RIOT', 'HOOD', 'PLTR', 'DKNG', 'ROKU', 'SQ', 'PYPL', 'SHOP', 'NET', 'SNOW'
];

class TickerUniverseService {
  
  constructor() {
    this.refreshUniverse();
  }

  async refreshUniverse() {
    console.log("   🌍 Loading Security Master...");
    let count = 0;

    // 1. Load Backup List (Immediate Safety)
    BACKUP_TICKERS.forEach(t => TICKER_SET.add(t));
    count += BACKUP_TICKERS.length;

    // 2. Try FMP (Stocks)
    if (FMP_KEY) {
        try {
            // Try 'sp500_constituent' first (more likely to work on new plans)
            const url = `https://financialmodelingprep.com/stable/sp500_constituent?apikey=${FMP_KEY}`;
            const res = await axios.get(url, { timeout: 5000 });
            if (Array.isArray(res.data)) {
                res.data.forEach((item: any) => {
                    if (item.symbol) TICKER_SET.add(item.symbol.toUpperCase());
                });
                console.log(`      -> Loaded S&P 500 from FMP`);
            }
        } catch (e) {
            // Silent fail, we have backups
        }
    }

    // 3. Load Crypto (Manual Top 50)
    const topCrypto = ['BTC','ETH','SOL','XRP','DOGE','ADA','AVAX','DOT','MATIC','LTC','UNI','LINK','SHIB','BCH','XLM','ATOM','XMR','ETC','HBAR','ICP'];
    topCrypto.forEach(c => {
        TICKER_SET.add(c);
        TICKER_SET.add(`${c}-USD`); // Handle Yahoo format
        TICKER_SET.add(`${c}USD`);  // Handle FMP format
    });

    console.log(`   ✅ Security Master Active: ${TICKER_SET.size} verified symbols.`);
  }

  isValidTicker(symbol: string): boolean {
    if (!symbol) return false;
    const upper = symbol.toUpperCase();
    
    // Direct match
    if (TICKER_SET.has(upper)) return true;
    
    // Crypto variations
    if (upper.endsWith('-USD') && TICKER_SET.has(upper.replace('-USD', ''))) return true;
    if (upper.endsWith('USD') && TICKER_SET.has(upper.replace('USD', ''))) return true;

    return false;
  }
}

export default new TickerUniverseService();
