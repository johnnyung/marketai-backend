import fmpService from './fmpService.js';
import { Candle } from '../types/dataProviderTypes.js';

interface AlgoPattern {
    pattern_detected: boolean;
    pattern_name: string;
    confidence: number; // 0-100
    details: string[];
    action_signal: 'ACCUMULATION' | 'DISTRIBUTION' | 'NEUTRAL';
}

class HedgeFundPatternEngine {

  /**
   * Main entry point for detecting HF Algo footprints
   */
  async analyze(ticker: string): Promise<AlgoPattern> {
    try {
        const candles = await fmpService.getDailyCandles(ticker, 40); // Look at last ~2 months

        if (!candles || candles.length < 10) return this.getFallback();
        
        // FMP returns newest first. Reverse for chronological analysis
        const chronology = [...candles].reverse();

        // 1. Check Quiet Accumulation (Stealth Ramp)
        const quietAccumulation = this.detectQuietAccumulation(chronology);
        if (quietAccumulation.detected) {
            return {
                pattern_detected: true,
                pattern_name: 'STEALTH_ACCUMULATION',
                confidence: quietAccumulation.confidence,
                details: ['Low Volatility Ramp', 'Steady Volume (No Spikes)', 'Higher Lows'],
                action_signal: 'ACCUMULATION'
            };
        }

        // 2. Check Volatility Compression (The "Coil")
        const squeeze = this.detectVolCompression(chronology);
        if (squeeze.detected) {
             return {
                pattern_detected: true,
                pattern_name: 'VOL_COMPRESSION_SQUEEZE',
                confidence: squeeze.confidence,
                details: ['ATR Shrinking', 'Price Coiling', 'Explosion Imminent'],
                action_signal: 'ACCUMULATION' // Usually precedes a move, context matters
            };
        }

        // 3. Check Breakout Engineering (Pinning before break)
        // Logic: Price hits resistance multiple times with shallow pullbacks
        
        // 4. Check Stop Run (V-Shape Rejection)
        const stopRun = this.detectStopRun(chronology);
        if (stopRun.detected) {
            return {
                pattern_detected: true,
                pattern_name: 'LIQUIDITY_STOP_RUN',
                confidence: 85,
                details: ['Wick below support', 'Strong close back inside range', 'Bear Trap'],
                action_signal: 'ACCUMULATION'
            };
        }

        return this.getFallback();

    } catch (e) {
        console.error(`HAPDE Error for ${ticker}:`, e);
        return this.getFallback();
    }
  }

  /**
   * Detects "Quiet Accumulation"
   * Criteria:
   * - Series of small bodied candles
   * - Slowly trending up (Higher Lows)
   * - No massive volume spikes (hiding tracks)
   */
  private detectQuietAccumulation(candles: Candle[]): { detected: boolean, confidence: number } {
      const recent = candles.slice(-10); // Last 10 days
      
      let higherLows = 0;
      let smallBodies = 0;
      const avgVol = recent.reduce((a,b) => a + b.volume, 0) / recent.length;

      for (let i = 1; i < recent.length; i++) {
          if (recent[i].low >= recent[i-1].low) higherLows++;
          
          const range = recent[i].high - recent[i].low;
          const body = Math.abs(recent[i].close - recent[i].open);
          
          // Check if body is small relative to range (Dozi/Spinning tops often used in stealth)
          // Or simply low range relative to price
          if ((range / recent[i].close) < 0.02) smallBodies++; // <2% daily range is "Quiet" for many stocks
      }

      // If we have mostly higher lows, quiet ranges, and volume isn't exploding (>2x avg)
      const volumeSpike = recent.some(c => c.volume > avgVol * 2.5);
      
      if (higherLows >= 7 && smallBodies >= 5 && !volumeSpike) {
          return { detected: true, confidence: 80 };
      }

      return { detected: false, confidence: 0 };
  }

  /**
   * Detects Volatility Compression (NR7 / NR4 style logic)
   * Criteria: ATR is decreasing over time.
   */
  private detectVolCompression(candles: Candle[]): { detected: boolean, confidence: number } {
      const recent = candles.slice(-5);
      const past = candles.slice(-20, -10); // Reference period
      
      const getAvgRange = (c: Candle[]) => c.reduce((a,b) => a + (b.high - b.low), 0) / c.length;
      
      const recentATR = getAvgRange(recent);
      const pastATR = getAvgRange(past);

      // If volatility has collapsed by 40% or more
      if (recentATR < pastATR * 0.6) {
          return { detected: true, confidence: 75 };
      }
      return { detected: false, confidence: 0 };
  }

  /**
   * Detects Stop Run (Hammer/Pinbar at lows)
   */
  private detectStopRun(candles: Candle[]): { detected: boolean } {
      const today = candles[candles.length - 1];
      const yesterday = candles[candles.length - 2];
      
      // Undercut low of yesterday
      const undercut = today.low < yesterday.low;
      
      // Close back inside yesterday's range (or higher)
      const recovery = today.close > yesterday.low;
      
      // Long lower wick
      const totalLen = today.high - today.low;
      const lowerWick = Math.min(today.open, today.close) - today.low;
      
      if (undercut && recovery && (lowerWick / totalLen > 0.6)) {
          return { detected: true };
      }
      return { detected: false };
  }

  private getFallback(): AlgoPattern {
      return {
          pattern_detected: false,
          pattern_name: 'NONE',
          confidence: 0,
          details: [],
          action_signal: 'NEUTRAL'
      };
  }
}

export default new HedgeFundPatternEngine();
