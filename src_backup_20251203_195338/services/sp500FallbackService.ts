import fmpService from './fmpService.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface Sp500UniverseResult {
  source: 'FMP' | 'LOCAL';
  tickers: string[];
  raw?: any;
}

class Sp500FallbackService {
  /**
   * Returns S&P 500 tickers from FMP, or falls back to local static file.
   * Designed to handle 403 Forbidden / Plan Restrictions gracefully.
   */
  async getSp500Universe(): Promise<Sp500UniverseResult> {
    // 1. Try FMP First
    try {
      // fmpService.getSP500List() calls /sp500-constituent
      const fmpData = await fmpService.getSP500List();
      
      if (Array.isArray(fmpData) && fmpData.length > 0) {
        const tickers = fmpData
          .map((item: any) => item.symbol)
          .filter((s: any) => typeof s === 'string' && s.length > 0);
        
        // Valid list check (arbitrary threshold > 10)
        if (tickers.length > 10) {
          return { source: 'FMP', tickers, raw: fmpData };
        }
      }
    } catch (e) {
      // Ignore FMP error, proceed to fallback
    }

    // 2. Fallback to Local JSON
    try {
      const localPath = path.join(__dirname, '../data/sp500-constituents.static.json');
      
      if (fs.existsSync(localPath)) {
        const rawData = fs.readFileSync(localPath, 'utf-8');
        const localJson = JSON.parse(rawData);
        
        if (Array.isArray(localJson) && localJson.length > 0) {
          const tickers = localJson
            .map((item: any) => item.symbol)
            .filter((s: any) => typeof s === 'string' && s.length > 0);
            
          if (tickers.length > 0) {
             return { source: 'LOCAL', tickers, raw: localJson };
          }
        }
      } else {
         console.warn(`[SP500] Local data file not found at ${localPath}`);
      }
    } catch (e) {
      console.warn(`[SP500] Local fallback error: ${(e as Error).message}`);
    }

    // 3. Ultimate Fallback (Hardcoded Safety Net)
    console.warn('[SP500] Fallback failed – returning minimal static universe');
    return {
      source: 'LOCAL',
      tickers: ['AAPL','MSFT','GOOGL','AMZN','NVDA','TSLA','META','JPM','NFLX','AMD']
    };
  }
}

export default new Sp500FallbackService();
