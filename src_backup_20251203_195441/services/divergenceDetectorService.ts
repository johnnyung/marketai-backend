import historicalDataService from './historicalDataService.js';
import { TechnicalMath } from '../utils/mathUtils.js';

interface DivergenceResult {
  ticker: string;
  has_divergence: boolean;
  divergence_type: 'REGULAR_BULL' | 'REGULAR_BEAR' | 'HIDDEN_BULL' | 'HIDDEN_BEAR' | 'NONE';
  strength: number; // 0-100
  fractal_confirmation: number; // How many windows confirmed it
  indicators: {
    rsi: boolean;
    obv: boolean;
    macd: boolean;
  };
  reason: string;
}

class DivergenceDetectorService {

  async analyze(ticker: string): Promise<DivergenceResult> {
      return this.analyzeFractals(ticker);
  }

  async analyzeFractals(ticker: string): Promise<DivergenceResult> {
    // console.log(`      〰️  Fractal Scan: Analyzing ${ticker}...`);

    try {
        // 1. Get Deep History (150 days for multi-fractal analysis)
        const history = await historicalDataService.getStockHistory(ticker, 150);
        if (history.length < 60) {
             return this.emptyResult(ticker, "Insufficient Data");
        }

        const closes = history.map(h => h.price);
        const volumes = history.map(h => h.volume || 1000);

        // 2. Calculate Indicators
        const rsi = this.calculateRSIArray(closes);
        const obv = this.calculateOBVArray(closes, volumes);

        // 3. Fractal Analysis (Check 3 Lookback Windows)
        // Short (5-day pivots), Medium (10-day pivots), Long (20-day pivots)
        const windows = [5, 10, 20];
        let bestSignal: DivergenceResult = this.emptyResult(ticker, "No Signal");
        let maxStrength = 0;

        for (const w of windows) {
            const signal = this.checkDivergenceInWindow(closes, rsi, obv, w, ticker);
            if (signal.has_divergence && signal.strength > maxStrength) {
                bestSignal = signal;
                maxStrength = signal.strength;
            }
        }

        return bestSignal;

    } catch (e: any) {
        return this.emptyResult(ticker, `Error: ${e.message}`);
    }
  }

  private checkDivergenceInWindow(prices: number[], rsi: number[], obv: number[], window: number, ticker: string): DivergenceResult {
        const peaks = this.findPeaks(prices, window);
        const valleys = this.findValleys(prices, window);
        
        const currentPrice = prices[prices.length - 1];
        const currentRSI = rsi[rsi.length - 1];
        const currentOBV = obv[obv.length - 1];

        let result = this.emptyResult(ticker, "None");
        let found = false;

        // --- 1. REGULAR BEARISH (Lower High in RSI, Higher High in Price) ---
        // Reversal Signal at Top
        if (peaks.length >= 2) {
            const lastPeak = peaks[peaks.length - 1];
            // If we are NEAR the last peak price-wise (within 2%) but RSI is lower
            if (currentPrice >= lastPeak.value * 0.98) {
                const prevRSI = rsi[lastPeak.index];
                if (currentRSI < prevRSI * 0.95) { // 5% divergence threshold
                    result.divergence_type = 'REGULAR_BEAR';
                    result.has_divergence = true;
                    result.strength = 75;
                    result.indicators.rsi = true;
                    result.reason = `REGULAR BEAR (Reversal): Price testing Highs ($${currentPrice.toFixed(2)}) but RSI weakening (${currentRSI.toFixed(0)} vs ${prevRSI.toFixed(0)}).`;
                    found = true;
                }
            }
        }

        // --- 2. REGULAR BULLISH (Higher Low in RSI, Lower Low in Price) ---
        // Reversal Signal at Bottom
        if (!found && valleys.length >= 2) {
            const lastValley = valleys[valleys.length - 1];
            if (currentPrice <= lastValley.value * 1.02) {
                const prevRSI = rsi[lastValley.index];
                if (currentRSI > prevRSI * 1.05) {
                    result.divergence_type = 'REGULAR_BULL';
                    result.has_divergence = true;
                    result.strength = 75;
                    result.indicators.rsi = true;
                    result.reason = `REGULAR BULL (Reversal): Price testing Lows ($${currentPrice.toFixed(2)}) but RSI strengthening.`;
                    found = true;
                }
            }
        }

        // --- 3. HIDDEN BULLISH (Lower Low in RSI, Higher Low in Price) ---
        // Trend Continuation (Buy the Dip)
        if (!found && valleys.length >= 2) {
             const lastValley = valleys[valleys.length - 1];
             // Price made a Higher Low (Uptrend structure)
             if (currentPrice > lastValley.value * 1.05) {
                 // But RSI is lower (Oversold in an uptrend)
                 const prevRSI = rsi[lastValley.index];
                 if (currentRSI < prevRSI && currentRSI < 45) {
                     result.divergence_type = 'HIDDEN_BULL';
                     result.has_divergence = true;
                     result.strength = 85; // Stronger than Regular
                     result.indicators.rsi = true;
                     result.reason = `HIDDEN BULL (Continuation): Price holding Higher Low structure, RSI reset to oversold. Buy the dip.`;
                     found = true;
                 }
             }
        }

        // --- 4. HIDDEN BEARISH (Higher High in RSI, Lower High in Price) ---
        // Trend Continuation (Sell the Rip)
        if (!found && peaks.length >= 2) {
            const lastPeak = peaks[peaks.length - 1];
            // Price made Lower High (Downtrend)
            if (currentPrice < lastPeak.value * 0.95) {
                // RSI made Higher High (Overbought in downtrend)
                const prevRSI = rsi[lastPeak.index];
                if (currentRSI > prevRSI && currentRSI > 55) {
                    result.divergence_type = 'HIDDEN_BEAR';
                    result.has_divergence = true;
                    result.strength = 85;
                    result.indicators.rsi = true;
                    result.reason = `HIDDEN BEAR (Continuation): Price making Lower Highs, RSI overheated. Sell the rip.`;
                    found = true;
                }
            }
        }

        // OBV Confirmation Bonus
        if (found && obv.length > 0) {
             // Simple check: Is OBV moving with the signal?
             const prevOBV = obv[obv.length - 10]; // 10 day slope
             const obvSlope = currentOBV - prevOBV;
             if ((result.divergence_type.includes('BULL') && obvSlope > 0) ||
                 (result.divergence_type.includes('BEAR') && obvSlope < 0)) {
                 result.strength += 10;
                 result.indicators.obv = true;
                 result.reason += " + OBV Confirmation.";
             }
        }
        
        if (found) result.fractal_confirmation = window; // Track which window found it
        return result;
  }

  private emptyResult(ticker: string, reason: string): DivergenceResult {
      return {
          ticker, has_divergence: false, divergence_type: 'NONE', strength: 0, fractal_confirmation: 0,
          indicators: { rsi: false, obv: false, macd: false }, reason
      };
  }

  // --- MATH HELPERS ---
  private calculateRSIArray(prices: number[], period = 14): number[] {
      const rsiArray = [];
      for(let i=0; i<period; i++) rsiArray.push(50);
      for (let i = period; i < prices.length; i++) {
          const slice = prices.slice(i - period, i + 1);
          rsiArray.push(TechnicalMath.calculateRSI(slice, period) || 50);
      }
      return rsiArray;
  }

  private calculateOBVArray(prices: number[], volumes: number[]): number[] {
      const obv = [0];
      for (let i = 1; i < prices.length; i++) {
          const change = prices[i] - prices[i-1];
          let val = obv[i-1];
          if (change > 0) val += volumes[i];
          else if (change < 0) val -= volumes[i];
          obv.push(val);
      }
      return obv;
  }

  private findPeaks(data: number[], window: number): { index: number, value: number }[] {
      const peaks = [];
      for (let i = window; i < data.length - window; i++) {
          const val = data[i];
          const left = data.slice(i - window, i);
          const right = data.slice(i + 1, i + 1 + window);
          if (val > Math.max(...left) && val > Math.max(...right)) {
              peaks.push({ index: i, value: val });
          }
      }
      return peaks;
  }

  private findValleys(data: number[], window: number): { index: number, value: number }[] {
      const valleys = [];
      for (let i = window; i < data.length - window; i++) {
          const val = data[i];
          const left = data.slice(i - window, i);
          const right = data.slice(i + 1, i + 1 + window);
          if (val < Math.min(...left) && val < Math.min(...right)) {
              valleys.push({ index: i, value: val });
          }
      }
      return valleys;
  }
}

export default new DivergenceDetectorService();
