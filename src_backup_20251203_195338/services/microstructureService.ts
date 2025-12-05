import fmpService from './fmpService.js';
import axios from 'axios';

const FMP_KEY = process.env.FMP_API_KEY;

interface MicroStructureMetrics {
  ticker: string;
  imbalanceScore: number; // -100 (Sell Pressure) to 100 (Buy Pressure)
  absorptionDetected: boolean;
  spreadTightness: 'Tight' | 'Wide';
  recommendation: 'ENTER_NOW' | 'WAIT_FOR_LIQUIDITY' | 'AVOID';
  reason: string;
}

class MicrostructureService {

  async scan(ticker: string): Promise<MicroStructureMetrics> {
    // console.log(`      🔬 Microstructure: Scanning ${ticker}...`);

    try {
      // 1. Get Real-Time Quote (Bid/Ask Size)
      // We use direct axios here to ensure we get the raw bidSize/askSize fields
      const quoteRes = await axios.get(`https://financialmodelingprep.com/stable/quote/${ticker}?apikey=${FMP_KEY}`, { timeout: 3000 });
      const quote = quoteRes.data[0];

      if (!quote) throw new Error("No Quote Data");

      // 2. Calculate Order Imbalance
      const bidSize = quote.bidSize || 0;
      const askSize = quote.askSize || 0;
      const totalSize = bidSize + askSize;
      
      // Score: -100 to 100. Positive = Buyers > Sellers
      let imbalanceScore = 0;
      if (totalSize > 0) {
          imbalanceScore = ((bidSize - askSize) / totalSize) * 100;
      }

      // 3. Calculate Spread
      const spread = quote.ask - quote.bid;
      const spreadPct = (spread / quote.price) * 100;
      const spreadTightness = spreadPct < 0.1 ? 'Tight' : 'Wide';

      // 4. Detect Absorption (1min Candles)
      // High volume but low price movement = Absorption (Hidden Wall)
      const candles = await fmpService.getIntraday(ticker); // Should be 1min or 5min
      let absorptionDetected = false;
      
      if (candles.length > 5) {
          const recent = candles[0]; // Most recent completed candle
          // Simple heuristic: Volume > Avg AND Body < 0.05%
          if (recent.volume > 10000 && Math.abs((recent.close - recent.open)/recent.open) < 0.0005) {
              absorptionDetected = true;
          }
      }

      // 5. Formulate Recommendation
      let recommendation: 'ENTER_NOW' | 'WAIT_FOR_LIQUIDITY' | 'AVOID' = 'ENTER_NOW';
      let reason = "";

      if (imbalanceScore > 20) {
          reason = `Buying Pressure Detected (Bid Size > Ask Size by ${imbalanceScore.toFixed(0)}%).`;
      } else if (imbalanceScore < -20) {
          recommendation = 'WAIT_FOR_LIQUIDITY';
          reason = `Selling Pressure Detected (Wall of Asks). Wait for clearing.`;
      } else {
          reason = "Balanced Order Book.";
      }

      if (absorptionDetected) {
          reason += " 🧊 Iceberg/Absorption detected (Hidden Liquidity).";
      }

      if (spreadTightness === 'Wide') {
          reason += " Spread is wide (Illiquid). Use Limit Orders.";
      }

      return {
          ticker,
          imbalanceScore,
          absorptionDetected,
          spreadTightness,
          recommendation,
          reason
      };

    } catch (e) {
      return {
          ticker, imbalanceScore: 0, absorptionDetected: false,
          spreadTightness: 'Wide', recommendation: 'ENTER_NOW', reason: "Microstructure Data Unavailable"
      };
    }
  }
}

export default new MicrostructureService();
