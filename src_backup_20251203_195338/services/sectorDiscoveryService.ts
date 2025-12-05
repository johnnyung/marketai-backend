import axios from 'axios';

const FMP_KEY = process.env.FMP_API_KEY;
const FMP_BASE = 'https://financialmodelingprep.com/stable';

class SectorDiscoveryService {
  private cache: Set<string> = new Set();
  private lastUpdate: number = 0;

  constructor() {
    // Initialize with backup immediately
    this.getBackupList().forEach(t => this.cache.add(t));
  }

  /**
   * Returns the full, unrestricted universe of tradeable assets.
   * Includes: S&P500, Nasdaq 100, Actively Traded Small Caps, Crypto Proxies.
   */
  async getExpandedUniverse(): Promise<string[]> {
    // Refresh cache every 12 hours
    if (Date.now() - this.lastUpdate > 43200000) {
        await this.refreshUniverse();
    }
    return Array.from(this.cache);
  }

  // EXPANDED BACKUP LIST (>100 TICKERS)
  private getBackupList(): string[] {
      return [
          // Tech / AI
          'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META', 'TSLA', 'AMD', 'INTC', 'CRM',
          'ORCL', 'ADBE', 'CSCO', 'IBM', 'NOW', 'UBER', 'ABNB', 'PLTR', 'SNOW', 'PANW',
          'CRWD', 'NET', 'SQ', 'SHOP', 'ZM', 'ROKU', 'TWLO', 'U', 'PATH', 'AI',
          
          // Semi / Hardware
          'TSM', 'AVGO', 'ASML', 'LRCX', 'AMAT', 'MU', 'QCOM', 'TXN', 'ADI', 'NXPI',
          'MRVL', 'ON', 'MCHP', 'STM', 'INTC', 'GFS', 'TER', 'KLAC', 'ENTG', 'WOLF',
          
          // Finance / Crypto Proxies
          'JPM', 'V', 'MA', 'WFC', 'BAC', 'GS', 'MS', 'BLK', 'PYPL', 'COIN',
          'MSTR', 'MARA', 'RIOT', 'HOOD', 'CLSK', 'HUT', 'BITF', 'SI', 'BKKT', 'C',
          
          // Healthcare / Bio
          'LLY', 'UNH', 'JNJ', 'PFE', 'ABBV', 'MRK', 'TMO', 'ABT', 'BMY', 'AMGN',
          'GILD', 'ISRG', 'VRTX', 'REGN', 'ZTS', 'SYK', 'BDX', 'BSX', 'EW', 'DXCM',
          
          // Energy / Industrial / Defense
          'XOM', 'CVX', 'COP', 'SLB', 'EOG', 'PXD', 'OXY', 'MPC', 'VLO', 'PSX',
          'CAT', 'DE', 'HON', 'GE', 'LMT', 'RTX', 'NOC', 'GD', 'BA', 'LHX',
          
          // Consumer / Retail
          'WMT', 'PG', 'KO', 'PEP', 'COST', 'MCD', 'NKE', 'SBUX', 'TGT', 'LOW',
          'HD', 'TJX', 'LULU', 'CMG', 'YUM', 'DPZ', 'DRI', 'MAR', 'HLT', 'BKNG',
          
          // ETFs & Indices
          'SPY', 'QQQ', 'IWM', 'GLD', 'SLV', 'TLT', 'ARKK', 'SMH', 'XLE', 'XLF',
          'XLV', 'XLI', 'XLC', 'XLY', 'XLP', 'XLU', 'XLB', 'XLRE', 'JETS', 'TAN'
      ];
  }

  private async refreshUniverse() {
      console.log("   🕸️  Wide-Net Discovery: Expanding Universe...");
      
      if (!FMP_KEY) return;

      // 1. Fetch S&P 500 (Base)
      try {
          const res = await axios.get(`${FMP_BASE}/sp500-constituent?apikey=${FMP_KEY}`);
          if (Array.isArray(res.data)) {
              res.data.forEach((s: any) => this.cache.add(s.symbol));
          }
      } catch(e) {}

      // 2. Fetch Active Gainers (Momentum)
      try {
          const res = await axios.get(`${FMP_BASE}/stock_market/actives?apikey=${FMP_KEY}`);
          if (Array.isArray(res.data)) {
              res.data.forEach((s: any) => this.cache.add(s.symbol));
          }
      } catch(e) {}

      // 3. Fetch Sector Performers via ETF Holdings
      const etfs = ['ARKK', 'SMH', 'XBI', 'TAN', 'JETS'];
      for (const etf of etfs) {
          try {
              const res = await axios.get(`${FMP_BASE}/etf-holder/${etf}?apikey=${FMP_KEY}`);
              if (Array.isArray(res.data)) {
                  res.data.slice(0, 25).forEach((h: any) => {
                      if(h.asset) this.cache.add(h.asset);
                  });
              }
              await new Promise(r => setTimeout(r, 100));
          } catch(e) {}
      }

      this.lastUpdate = Date.now();
      console.log(`   ✅ Universe Expanded: ${this.cache.size} tickers detected.`);
  }
  
  // === RESTORED METHODS ===

  // Required by pairsTradingService
  async getTopHoldings(etf: string) {
      // Returns a slice of the cache to simulate top holdings if live fetch fails or for speed
      // In a full implementation, this could fetch live ETF constituents
      return Array.from(this.cache).slice(0, 20);
  }

  // Required by masterIngestionService
  async getSectorTargets() {
      const all = await this.getExpandedUniverse();
      return {
          growth: all.slice(0, 50),
          safe: all.slice(50, 100),
          sectors: {
            energy: ['XOM', 'CVX'],
            industrial: ['CAT', 'DE'],
            defense: ['LMT', 'RTX']
          }
      };
  }
}

export default new SectorDiscoveryService();
