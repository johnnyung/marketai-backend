import fmpService from './fmpService.js';

class PriceService {
  async getCurrentPrice(ticker: string): Promise<any> {
    try {
        const raw = await fmpService.getPrice(ticker);
        if (!raw) return { ticker, price: null, capability: 'UNAVAILABLE' };
        
        // Return full object for compatibility with MarketDataService
        return {
            ticker: raw.symbol || ticker,
            price: raw.price,
            change: raw.change || 0,
            changePercent: raw.changesPercentage || 0,
            timestamp: new Date(),
            capability: 'OK',
            source: 'FMP_Stable'
        };
    } catch (e: any) {
        return { ticker, price: null, capability: 'ERROR', error: e.message };
    }
  }
}
export default new PriceService();
