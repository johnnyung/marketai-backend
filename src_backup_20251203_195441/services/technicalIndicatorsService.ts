import fmpService from './fmpService.js';

interface TechnicalData {
  ticker: string;
  rsi: number;
  movingAverages: { ma50: number; ma200: number; };
  overallSignal: 'bullish' | 'bearish' | 'neutral';
  signals: string[];
  volatility?: number;
  momentumProfile?: 'High' | 'Medium' | 'Low';
  recommendedTTL?: number;
}

class TechnicalIndicatorsService {
  async getTechnicalIndicators(ticker: string): Promise<TechnicalData | null> {
    try {
      // FIX: Extract values from arrays
      const [rsiData, sma50Data, sma200Data] = await Promise.all([
        fmpService.getRSI(ticker),
        fmpService.getSMA(ticker, 50),
        fmpService.getSMA(ticker, 200)
      ]);

      const rsi = rsiData?.[0]?.rsi || 50;
      const ma50 = sma50Data?.[0]?.sma || 0;
      const ma200 = sma200Data?.[0]?.sma || 0;

      let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
      if (rsi > 50 && ma50 > ma200) signal = 'bullish';
      else if (rsi < 50 && ma50 < ma200) signal = 'bearish';

      return {
        ticker,
        rsi,
        movingAverages: { ma50, ma200 },
        overallSignal: signal,
        signals: []
      };
    } catch (e) {
      console.error('Tech Error:', e);
      return { ticker, rsi: 50, movingAverages: { ma50: 0, ma200: 0 }, overallSignal: 'neutral', signals: [] };
    }
  }
}

export default new TechnicalIndicatorsService();
