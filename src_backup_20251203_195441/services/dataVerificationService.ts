// src/services/dataVerificationService.ts
// Verifies if data sources are returning REAL data vs mock/simulated

import axios from 'axios';

interface VerificationResult {
  source: string;
  isReal: boolean;
  reason: string;
  lastPrice?: number;
  timestamp?: string;
}

class DataVerificationService {
  
  async verifyAllSources(): Promise<VerificationResult[]> {
    const results: VerificationResult[] = [];

    // Test Alpha Vantage (real stock data)
    results.push(await this.verifyAlphaVantage());
    
    // Test CoinGecko (real crypto data)
    results.push(await this.verifyCrypto());
    
    // Test Database collections
    results.push(await this.verifyDatabaseData());
    
    return results;
  }

  private async verifyAlphaVantage(): Promise<VerificationResult> {
    try {
      const API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
      if (!API_KEY) {
        return {
          source: 'Alpha Vantage Stock Prices',
          isReal: false,
          reason: 'API key not configured'
        };
      }

      const response = await axios.get(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=SPY&apikey=${API_KEY}`
      );

      const quote = response.data['Global Quote'];
      if (quote && quote['05. price']) {
        return {
          source: 'Alpha Vantage Stock Prices',
          isReal: true,
          reason: 'Live data from Alpha Vantage API',
          lastPrice: parseFloat(quote['05. price']),
          timestamp: quote['07. latest trading day']
        };
      }

      return {
        source: 'Alpha Vantage Stock Prices',
        isReal: false,
        reason: 'Invalid API response'
      };
    } catch (error) {
      return {
        source: 'Alpha Vantage Stock Prices',
        isReal: false,
        reason: 'API call failed - using fallback data'
      };
    }
  }

  private async verifyCrypto(): Promise<VerificationResult> {
    try {
      const response = await axios.get(
        'https://api.coingecko.com/stable/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true'
      );

      if (response.data.bitcoin && response.data.bitcoin.usd) {
        return {
          source: 'CoinGecko Crypto Prices',
          isReal: true,
          reason: 'Live data from CoinGecko API (free tier)',
          lastPrice: response.data.bitcoin.usd,
          timestamp: new Date().toISOString()
        };
      }

      return {
        source: 'CoinGecko Crypto Prices',
        isReal: false,
        reason: 'Invalid response'
      };
    } catch (error) {
      return {
        source: 'CoinGecko Crypto Prices',
        isReal: false,
        reason: 'API unavailable - using simulated data'
      };
    }
  }

  private async verifyDatabaseData(): Promise<VerificationResult> {
    try {
      // Check if raw_data_collection has real data or mock
      const { Pool } = await import('pg');
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });

      const result = await pool.query(`
        SELECT 
          COUNT(*) FILTER (WHERE data_json::text LIKE '%simulated%') as mock_count,
          COUNT(*) FILTER (WHERE data_json::text NOT LIKE '%simulated%') as real_count
        FROM raw_data_collection
        WHERE collected_at > NOW() - INTERVAL '1 hour'
      `);

      const row = result.rows[0];
      const realCount = parseInt(row.real_count);
      const mockCount = parseInt(row.mock_count);

      await pool.end();

      if (realCount > mockCount) {
        return {
          source: 'Database Collections',
          isReal: true,
          reason: `${realCount} real items vs ${mockCount} mock in last hour`
        };
      }

      return {
        source: 'Database Collections',
        isReal: false,
        reason: `${mockCount} simulated items vs ${realCount} real - need API keys`
      };
    } catch (error) {
      return {
        source: 'Database Collections',
        isReal: false,
        reason: 'Could not verify database'
      };
    }
  }
}

export default new DataVerificationService();
