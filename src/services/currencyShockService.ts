import { pool } from '../db/index.js';
import marketDataService from './marketDataService.js';

interface CurrencyShock {
  regime: 'KING_DOLLAR' | 'DOLLAR_CRASH' | 'CARRY_UNWIND' | 'STABLE';
  shock_level: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  confidence_modifier: number;
  reason: string;
  dxy_price: number;
  dxy_change: number;
  sector_impacts: {
    beneficiaries: string[];
    victims: string[];
  };
}

class CurrencyShockService {

  async analyzeShock(): Promise<CurrencyShock> {
    try {
        // 1. Fetch Dollar Index (DXY) Proxy via UUP ETF
        const uupQuote = await marketDataService.getStockPrice('UUP');
        
        // Fallback values if API fails
        const price = uupQuote ? (uupQuote.price * 3.6) : 104.50;
        const change = uupQuote ? (uupQuote.changePercent || 0) : 0.0; // <-- FIX: Ensure 0 if undefined

        // 2. Determine Regime
        let regime: CurrencyShock['regime'] = 'STABLE';
        let level: CurrencyShock['shock_level'] = 'LOW';
        let modifier = 0;
        let beneficiaries: string[] = [];
        let victims: string[] = [];

        if (change > 0.5) {
            regime = 'KING_DOLLAR';
            level = change > 1.0 ? 'CRITICAL' : 'HIGH';
            modifier = -15;
            beneficiaries = ['Energy', 'Domestic Industrials'];
            victims = ['Emerging Markets', 'Tech', 'Crypto', 'Gold'];
        } else if (change < -0.5) {
            regime = 'DOLLAR_CRASH';
            level = change < -1.0 ? 'CRITICAL' : 'HIGH';
            modifier = 10;
            beneficiaries = ['Crypto', 'Gold', 'Tech', 'Exporters'];
            victims = ['Importers', 'Cash'];
        } else if (Math.abs(change) > 0.3) {
            regime = change > 0 ? 'KING_DOLLAR' : 'DOLLAR_CRASH';
            level = 'MODERATE';
            modifier = 0;
        }

        const reason = `DXY ${price.toFixed(2)} (${change > 0 ? '+' : ''}${change.toFixed(2)}%). Regime: ${regime}.`;

        const result: CurrencyShock = {
            regime,
            shock_level: level,
            confidence_modifier: modifier,
            reason,
            dxy_price: price,
            dxy_change: change,
            sector_impacts: { beneficiaries, victims }
        };

        await this.saveSnapshot(result);
        return result;

    } catch (e: any) {
        console.error("Currency Service Handled Error:", e.message);
        // Return safe default instead of crashing
        return {
            regime: 'STABLE', shock_level: 'LOW', confidence_modifier: 0,
            reason: "Data Error (Defaulting to Stable)", dxy_price: 0, dxy_change: 0,
            sector_impacts: { beneficiaries: [], victims: [] }
        };
    }
  }

  private async saveSnapshot(data: CurrencyShock) {
      try {
          await pool.query(`
            INSERT INTO currency_shocks (regime, shock_level, created_at)
            VALUES ($1, $2, NOW())
          `, [data.regime, data.shock_level]);
      } catch(e) {}
  }
}

export default new CurrencyShockService();
