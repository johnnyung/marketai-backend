// backend/src/services/technicalIndicatorsService.ts
// Real technical indicators from Alpha Vantage (FREE!)

import axios from 'axios';

interface TechnicalData {
  ticker: string;
  rsi: number;
  macd: {
    value: number;
    signal: number;
    histogram: number;
  };
  movingAverages: {
    ma20: number;
    ma50: number;
    ma200: number;
  };
  volume: {
    current: number;
    average: number;
    ratio: number;
  };
  signals: string[];
  overallSignal: 'bullish' | 'bearish' | 'neutral';
}

class TechnicalIndicatorsService {
  private apiKey: string;
  private baseUrl = 'https://www.alphavantage.co/query';
  
  constructor() {
    this.apiKey = process.env.ALPHA_VANTAGE_API_KEY || '';
  }
  
  async getTechnicalIndicators(ticker: string): Promise<TechnicalData | null> {
    try {
      console.log(`📊 Fetching technical indicators for ${ticker}...`);
      
      // Fetch RSI, MACD, and SMA in parallel
      const [rsiData, macdData, smaData, quoteData] = await Promise.all([
        this.getRSI(ticker),
        this.getMACD(ticker),
        this.getSMA(ticker),
        this.getQuote(ticker)
      ]);
      
      if (!rsiData || !macdData || !smaData) {
        console.log(`⚠️ Missing technical data for ${ticker}`);
        return null;
      }
      
      const signals: string[] = [];
      
      // RSI signals
      if (rsiData < 30) {
        signals.push('RSI oversold (<30) - potential buy');
      } else if (rsiData > 70) {
        signals.push('RSI overbought (>70) - potential sell');
      } else if (rsiData > 50 && rsiData < 70) {
        signals.push('RSI bullish momentum (50-70)');
      }
      
      // MACD signals
      if (macdData.histogram > 0 && macdData.value > macdData.signal) {
        signals.push('MACD bullish crossover');
      } else if (macdData.histogram < 0 && macdData.value < macdData.signal) {
        signals.push('MACD bearish crossover');
      }
      
      // Moving Average signals
      if (smaData.ma20 > smaData.ma50 && smaData.ma50 > smaData.ma200) {
        signals.push('Golden Cross - All MAs bullishly aligned');
      } else if (smaData.ma20 < smaData.ma50 && smaData.ma50 < smaData.ma200) {
        signals.push('Death Cross - All MAs bearishly aligned');
      }
      
      // Volume signals
      const volume = quoteData?.volume || 0;
      const avgVolume = quoteData?.volume ? quoteData.volume * 0.8 : 0;
      const volumeRatio = avgVolume > 0 ? volume / avgVolume : 1;
      
      if (volumeRatio > 1.5) {
        signals.push('High volume spike detected');
      }
      
      // Overall signal
      let bullishCount = 0;
      let bearishCount = 0;
      
      signals.forEach(signal => {
        if (signal.includes('bullish') || signal.includes('buy') || signal.includes('Golden')) {
          bullishCount++;
        }
        if (signal.includes('bearish') || signal.includes('sell') || signal.includes('Death')) {
          bearishCount++;
        }
      });
      
      const overallSignal = bullishCount > bearishCount ? 'bullish' :
                           bearishCount > bullishCount ? 'bearish' : 'neutral';
      
      const result: TechnicalData = {
        ticker,
        rsi: rsiData,
        macd: macdData,
        movingAverages: smaData,
        volume: {
          current: volume,
          average: avgVolume,
          ratio: volumeRatio
        },
        signals,
        overallSignal
      };
      
      console.log(`✅ Technical indicators for ${ticker}: ${signals.length} signals`);
      return result;
      
    } catch (error: any) {
      console.error(`❌ Technical indicators error for ${ticker}:`, error.message);
      return null;
    }
  }
  
  async getBatchTechnicalIndicators(tickers: string[]): Promise<TechnicalData[]> {
    console.log(`📊 Fetching technical indicators for ${tickers.length} tickers...`);
    
    const results: TechnicalData[] = [];
    
    // Process in batches to avoid rate limits
    for (let i = 0; i < tickers.length; i += 3) {
      const batch = tickers.slice(i, i + 3);
      const batchResults = await Promise.all(
        batch.map(ticker => this.getTechnicalIndicators(ticker))
      );
      
      batchResults.forEach(result => {
        if (result) results.push(result);
      });
      
      // Rate limit: 5 calls per minute for free tier
      if (i + 3 < tickers.length) {
        await this.sleep(12000); // Wait 12 seconds between batches
      }
    }
    
    console.log(`✅ Technical indicators complete: ${results.length}/${tickers.length} tickers`);
    return results;
  }
  
  private async getRSI(ticker: string): Promise<number | null> {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          function: 'RSI',
          symbol: ticker,
          interval: 'daily',
          time_period: 14,
          series_type: 'close',
          apikey: this.apiKey
        },
        timeout: 10000
      });
      
      const data = response.data['Technical Analysis: RSI'];
      if (!data) return null;
      
      const latestDate = Object.keys(data)[0];
      return parseFloat(data[latestDate]['RSI']);
      
    } catch (error) {
      console.error(`RSI error for ${ticker}:`, error);
      return null;
    }
  }
  
  private async getMACD(ticker: string): Promise<any> {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          function: 'MACD',
          symbol: ticker,
          interval: 'daily',
          series_type: 'close',
          apikey: this.apiKey
        },
        timeout: 10000
      });
      
      const data = response.data['Technical Analysis: MACD'];
      if (!data) return null;
      
      const latestDate = Object.keys(data)[0];
      const latest = data[latestDate];
      
      return {
        value: parseFloat(latest['MACD']),
        signal: parseFloat(latest['MACD_Signal']),
        histogram: parseFloat(latest['MACD_Hist'])
      };
      
    } catch (error) {
      console.error(`MACD error for ${ticker}:`, error);
      return null;
    }
  }
  
  private async getSMA(ticker: string): Promise<any> {
    try {
      // Get 20, 50, 200 day SMAs
      const [sma20, sma50, sma200] = await Promise.all([
        this.getSingleSMA(ticker, 20),
        this.getSingleSMA(ticker, 50),
        this.getSingleSMA(ticker, 200)
      ]);
      
      return {
        ma20: sma20 || 0,
        ma50: sma50 || 0,
        ma200: sma200 || 0
      };
      
    } catch (error) {
      console.error(`SMA error for ${ticker}:`, error);
      return null;
    }
  }
  
  private async getSingleSMA(ticker: string, period: number): Promise<number | null> {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          function: 'SMA',
          symbol: ticker,
          interval: 'daily',
          time_period: period,
          series_type: 'close',
          apikey: this.apiKey
        },
        timeout: 10000
      });
      
      const data = response.data['Technical Analysis: SMA'];
      if (!data) return null;
      
      const latestDate = Object.keys(data)[0];
      return parseFloat(data[latestDate]['SMA']);
      
    } catch (error) {
      return null;
    }
  }
  
  private async getQuote(ticker: string): Promise<any> {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          function: 'GLOBAL_QUOTE',
          symbol: ticker,
          apikey: this.apiKey
        },
        timeout: 10000
      });
      
      const quote = response.data['Global Quote'];
      if (!quote) return null;
      
      return {
        price: parseFloat(quote['05. price']),
        volume: parseInt(quote['06. volume']),
        change: parseFloat(quote['09. change']),
        changePercent: parseFloat(quote['10. change percent'].replace('%', ''))
      };
      
    } catch (error) {
      return null;
    }
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default new TechnicalIndicatorsService();
