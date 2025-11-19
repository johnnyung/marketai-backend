// src/services/historicalDataFetcher.ts
// Uses Polygon.io - Free tier: 5 calls/min, very reliable

import axios from 'axios';
import pool from '../db/index.js';

class HistoricalDataFetcher {
  private polygonKey: string;
  
  constructor() {
    this.polygonKey = process.env.POLYGON_API_KEY || '';
    if (!this.polygonKey) {
      console.warn('⚠️  POLYGON_API_KEY not set - data collection will fail');
    }
  }
  
  /**
   * Fetch 3 years of crypto data from Polygon
   */
  async fetchCryptoHistorical(symbol: string = 'BTC', years: number = 3) {
    console.log(`📊 Fetching ${years} years of ${symbol} historical data...`);
    
    if (!this.polygonKey) {
      throw new Error('POLYGON_API_KEY not configured');
    }
    
    const ticker = `X:${symbol}USD`; // Polygon crypto format
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - years);
    
    try {
      // Fetch daily aggregates (Polygon free tier limit)
      const url = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/day/${this.formatDate(startDate)}/${this.formatDate(endDate)}`;
      
      const response = await axios.get(url, {
        params: {
          adjusted: 'true',
          sort: 'asc',
          limit: 50000,
          apiKey: this.polygonKey
        }
      });
      
      if (response.data.status !== 'OK' && response.data.status !== 'DELAYED') {
        throw new Error(`Polygon API error: ${response.data.status}`);
      }
      
      const results = response.data.results || [];
      
      // Convert daily to hourly estimates (repeat each day's close 24 times)
      const records = [];
      for (const day of results) {
        const date = new Date(day.t);
        
        // Create 24 hourly records per day
        for (let hour = 0; hour < 24; hour++) {
          const timestamp = new Date(date);
          timestamp.setHours(hour);
          
          records.push({
            timestamp,
            price: day.c, // close price
            dayOfWeek: timestamp.getDay(),
            isWeekend: timestamp.getDay() === 0 || timestamp.getDay() === 6,
            isAfterHours: this.isAfterHours(timestamp),
            hourOfDay: hour
          });
        }
      }
      
      const stored = await this.storeCryptoData(symbol, records);
      console.log(`✅ Stored ${stored} ${symbol} price records (${results.length} days → ${records.length} hours)`);
      
      return stored;
      
    } catch (error: any) {
      console.error(`Failed to fetch ${symbol}:`, error.message);
      throw error;
    }
  }
  
  /**
   * Fetch historical stock data from Polygon
   */
  async fetchStockHistorical(symbol: string, years: number = 3) {
    console.log(`📈 Fetching ${years} years of ${symbol} stock data...`);
    
    if (!this.polygonKey) {
      throw new Error('POLYGON_API_KEY not configured');
    }
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - years);
    
    try {
      const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/day/${this.formatDate(startDate)}/${this.formatDate(endDate)}`;
      
      const response = await axios.get(url, {
        params: {
          adjusted: 'true',
          sort: 'asc',
          limit: 50000,
          apiKey: this.polygonKey
        }
      });
      
      if (response.data.status !== 'OK' && response.data.status !== 'DELAYED') {
        throw new Error(`Polygon API error: ${response.data.status}`);
      }
      
      const results = response.data.results || [];
      
      const records = [];
      let previousFridayClose = null;
      
      for (const day of results) {
        const date = new Date(day.t);
        const dayOfWeek = date.getDay();
        const isMonday = dayOfWeek === 1;
        
        // Track Friday closes
        if (dayOfWeek === 5) {
          previousFridayClose = day.c;
        }
        
        records.push({
          symbol,
          date,
          open: day.o,
          close: day.c,
          high: day.h,
          low: day.l,
          volume: day.v,
          dayOfWeek,
          isMonday,
          previousFridayClose: isMonday ? previousFridayClose : null
        });
      }
      
      const stored = await this.storeStockData(records);
      console.log(`✅ Stored ${stored} ${symbol} stock records`);
      
      return stored;
      
    } catch (error: any) {
      console.error(`Failed to fetch ${symbol}:`, error.message);
      throw error;
    }
  }
  
  /**
   * Store crypto data
   */
  private async storeCryptoData(symbol: string, data: any[]) {
    let stored = 0;
    
    for (const record of data) {
      try {
        await pool.query(`
          INSERT INTO crypto_historical_prices 
          (symbol, price, timestamp, day_of_week, is_weekend, is_after_hours, hour_of_day)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (symbol, timestamp) DO NOTHING
        `, [
          symbol,
          record.price,
          record.timestamp,
          record.dayOfWeek,
          record.isWeekend,
          record.isAfterHours,
          record.hourOfDay
        ]);
        stored++;
      } catch (error) {
        // Skip duplicates
      }
    }
    
    return stored;
  }
  
  /**
   * Store stock data
   */
  private async storeStockData(records: any[]) {
    let stored = 0;
    
    for (const record of records) {
      try {
        await pool.query(`
          INSERT INTO stock_historical_prices 
          (symbol, open_price, close_price, high_price, low_price, volume, date, day_of_week, is_monday_open, previous_friday_close)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (symbol, date) DO NOTHING
        `, [
          record.symbol,
          record.open,
          record.close,
          record.high,
          record.low,
          record.volume,
          record.date,
          record.dayOfWeek,
          record.isMonday,
          record.previousFridayClose
        ]);
        stored++;
      } catch (error) {
        // Skip duplicates
      }
    }
    
    return stored;
  }
  
  /**
   * Check if after hours
   */
  private isAfterHours(date: Date): boolean {
    const hour = date.getUTCHours() - 5; // ET
    const dayOfWeek = date.getDay();
    
    if (dayOfWeek === 0 || dayOfWeek === 6) return true;
    
    return hour < 9 || (hour === 9 && date.getMinutes() < 30) || hour >= 16;
  }
  
  /**
   * Format date for Polygon API (YYYY-MM-DD)
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
  
  /**
   * Sleep for rate limiting
   */
  private sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Fetch all symbols (one at a time for free tier)
   */
  async fetchAllHistorical() {
    console.log('🚀 Starting comprehensive historical data collection...');
    console.log('   Using Polygon.io API');
    
    const cryptos = ['BTC', 'ETH', 'SOL'];
    const stocks = ['SPY', 'QQQ', 'COIN', 'MSTR', 'TSLA', 'NVDA'];
    
    let totalRecords = 0;
    
    // Free tier: 5 calls/min
    const DELAY_MS = 13000; // 13 seconds between calls = ~4.6 calls/min
    
    console.log(`   Rate limit: ${DELAY_MS/1000}s between symbols`);
    console.log('');
    
    // Fetch crypto
    for (const crypto of cryptos) {
      try {
        const records = await this.fetchCryptoHistorical(crypto, 3);
        totalRecords += records;
        await this.sleep(DELAY_MS);
      } catch (error: any) {
        console.error(`  ❌ ${crypto} failed:`, error.message);
        await this.sleep(DELAY_MS);
      }
    }
    
    // Fetch stocks
    for (const stock of stocks) {
      try {
        const records = await this.fetchStockHistorical(stock, 3);
        totalRecords += records;
        await this.sleep(DELAY_MS);
      } catch (error: any) {
        console.error(`  ❌ ${stock} failed:`, error.message);
        await this.sleep(DELAY_MS);
      }
    }
    
    console.log(`✅ Collection complete: ${totalRecords} total records`);
    
    return { success: true, totalRecords };
  }
}

export default new HistoricalDataFetcher();
