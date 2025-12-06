import fmpService from './fmpService.js';
import { pool } from '../db/index.js';

interface DarkLevel {
  price: number;
  volume: number;
  strength: 'STRONG' | 'MODERATE' | 'WEAK';
  bias: 'SUPPORT' | 'RESISTANCE';
}

class DarkPoolService {

  async scanDarkPools(ticker: string): Promise<DarkLevel[]> {
    // console.log(`      🌑 Dark Pool Scan: ${ticker}...`);
    const levels: DarkLevel[] = [];

    try {
        // 1. Get Intraday Data (1min or 5min)
        // We look for "Volume Spikes" on "Low Volatility" candles
        const candles = await fmpService.getIntraday(ticker);
        
        if (!candles || candles.length < 60) return [];

        // 2. Analyze for Signature Prints
        // Heuristic: Vol > 5x Avg AND (High-Low) < 0.05% (Tight Spread)
        const volumes = candles.map((c: any) => c.volume);
        const avgVol = volumes.reduce((a: number, b: number) => a + b, 0) / volumes.length;
        const threshold = avgVol * 5;

        for (const c of candles) {
            const range = (c.high - c.low) / c.close;
            
            if (c.volume > threshold && range < 0.001) {
                // This is likely a Dark Pool Print or Block Trade
                // Determine Bias based on Close vs Open
                const bias = c.close >= c.open ? 'SUPPORT' : 'RESISTANCE';
                
                levels.push({
                    price: c.close,
                    volume: c.volume,
                    strength: c.volume > (avgVol * 10) ? 'STRONG' : 'MODERATE',
                    bias
                });
            }
        }

        // 3. Cluster Levels (Group nearby prints)
        return this.clusterLevels(levels);

    } catch (e) {
        return [];
    }
  }

  private clusterLevels(levels: DarkLevel[]): DarkLevel[] {
      if (levels.length === 0) return [];
      
      // Sort by price
      levels.sort((a, b) => a.price - b.price);
      
      const clusters: DarkLevel[] = [];
      let current = levels[0];
      
      for (let i = 1; i < levels.length; i++) {
          const next = levels[i];
          // If prices are within 0.5%, merge them
          if ((next.price - current.price) / current.price < 0.005) {
              current.volume += next.volume;
              current.strength = current.volume > 100000 ? 'STRONG' : current.strength;
              // Keep bias of largest print
          } else {
              clusters.push(current);
              current = next;
          }
      }
      clusters.push(current);
      
      // Return top 3 largest levels
      return clusters.sort((a, b) => b.volume - a.volume).slice(0, 3);
  }
}

export default new DarkPoolService();
