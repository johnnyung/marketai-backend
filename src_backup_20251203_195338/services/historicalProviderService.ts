import fmpService from './fmpService.js';
import { Candle } from '../types/dataProviderTypes.js';

class HistoricalProviderService {

  /**
   * Normalizes candle data:
   * 1. Parses numeric fields safely
   * 2. Filters invalid/null rows
   * 3. Dedupes by date
   * 4. Sorts Ascending (Oldest -> Newest)
   */
  private normalizeCandles(raw: any[]): Candle[] {
    if (!Array.isArray(raw) || raw.length === 0) return [];

    const validMap = new Map<string, Candle>();

    for (const item of raw) {
      // Handle various FMP formats (date vs formated date)
      const dateStr = item.date || item.formated;
      if (!dateStr) continue;

      // Parse values safely
      const open = parseFloat(item.open);
      const high = parseFloat(item.high);
      const low = parseFloat(item.low);
      const close = parseFloat(item.close);
      const volume = parseFloat(item.volume);

      // Strict validation
      if (
        isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close) ||
        open <= 0 || high <= 0 || low <= 0 || close <= 0
      ) {
        continue;
      }

      // Add to map (Deduping)
      validMap.set(dateStr, {
        date: dateStr,
        open,
        high,
        low,
        close,
        volume: isNaN(volume) ? 0 : volume
      });
    }

    // Convert to array and Sort Ascending
    return Array.from(validMap.values()).sort((a, b) => {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
  }

  /**
   * Get Daily Candles (Hardened)
   */
  async getDailyCandlesNormalized(ticker: string, days: number = 30): Promise<Candle[]> {
    try {
      // Uses FMP Service (Stable API)
      const raw = await fmpService.getDailyCandles(ticker, days);
      if (!raw || raw.length === 0) {
        console.warn(`[History] Daily data empty for ${ticker}`);
        return [];
      }
      return this.normalizeCandles(raw);
    } catch (e: any) {
      console.warn(`[History] Daily fetch failed for ${ticker}: ${e.message}`);
      return [];
    }
  }

  /**
   * Get Intraday Candles (Hardened)
   */
  async getIntradayCandlesNormalized(
    ticker: string,
    interval: '1min' | '5min' | '15min' | '30min' | '1hour' = '5min',
    limit: number = 100
  ): Promise<Candle[]> {
    try {
      // fmpService.getIntraday expects '5min' format
      const raw = await fmpService.getIntraday(ticker, interval);
      
      if (!raw || raw.length === 0) {
        console.warn(`[History] Intraday data empty for ${ticker} (${interval})`);
        return [];
      }

      // Normalize & Sort
      const normalized = this.normalizeCandles(raw);
      
      // Since we want the most recent 'limit' candles, but sorted ASC:
      // 1. Slice from the end (newest)
      // 2. Or if normalized is ASC, take the last 'limit'
      return normalized.slice(-limit);
      
    } catch (e: any) {
      console.warn(`[History] Intraday fetch failed for ${ticker}: ${e.message}`);
      return [];
    }
  }
}

export default new HistoricalProviderService();
