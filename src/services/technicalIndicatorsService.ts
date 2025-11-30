import fmpService from './fmpService.js';
import historicalDataService from './historicalDataService.js';
import { TechnicalMath } from '../utils/mathUtils.js';

interface TechnicalData {
  ticker: string;
  rsi: number;
  movingAverages: { ma50: number; ma200: number; };
  overallSignal: 'bullish' | 'bearish' | 'neutral';
  signals: string[];
  // New fields
  volatility?: number;
  momentumProfile?: 'High' | 'Medium' | 'Low';
  recommendedTTL?: number; // Hours
}

class TechnicalIndicatorsService {
  
  async getTechnicalIndicators(ticker: string): Promise<TechnicalData | null> {
    // 1. API Strategy (RSI/SMA)
    let rsi = 50, sma50 = 0, sma200 = 0;
    
    try {
      const [r, s50, s200] = await Promise.all([
        fmpService.getRSI(ticker),
        fmpService.getSMA(ticker, 50),
        fmpService.getSMA(ticker, 200)
      ]);
      if (r) { rsi = r; sma50 = s50 || 0; sma200 = s200 || 0; }
    } catch(e) {}

    // 2. Volatility / Decay Calculation (Local Math)
    let volatility = 0;
    let momentumProfile: 'High' | 'Medium' | 'Low' = 'Medium';
    let ttl = 120; // Default 5 days (hours)

    try {
        const history = await historicalDataService.getStockHistory(ticker, 30); // 30 days
        if (history.length > 10) {
            const prices = history.map(h => h.price);
            volatility = TechnicalMath.calculateVolatility(TechnicalMath.getReturns(prices)) * 100; // Annualized-ish

            // Determine Profile based on Volatility
            if (volatility > 3.0) {
                momentumProfile = 'High'; // Fast mover (News/Earnings)
                ttl = 48; // 2 days
            } else if (volatility < 1.0) {
                momentumProfile = 'Low'; // Slow mover (Value)
                ttl = 336; // 14 days
            } else {
                momentumProfile = 'Medium'; // Standard trend
                ttl = 120; // 5 days
            }
        }
    } catch(e) {}

    // 3. Analysis Logic
    const signals: string[] = [];
    if (rsi < 30) signals.push(`RSI Oversold (${rsi.toFixed(0)})`);
    else if (rsi > 70) signals.push(`RSI Overbought (${rsi.toFixed(0)})`);
    
    if (sma50 > 0 && sma200 > 0) {
        if (sma50 > sma200) signals.push("Uptrend (SMA50 > SMA200)");
    }

    let overallSignal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (rsi < 70) {
        if (rsi < 35 || (sma50 > sma200)) overallSignal = 'bullish';
    }
    if (rsi > 70) overallSignal = 'bearish';

    return {
        ticker, rsi, movingAverages: { ma50: sma50, ma200: sma200 },
        overallSignal, signals,
        volatility, momentumProfile, recommendedTTL: ttl
    };
  }
}

export default new TechnicalIndicatorsService();
