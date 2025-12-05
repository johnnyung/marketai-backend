import historicalDataService from './historicalDataService.js';

interface MomentumProfile {
  ticker: string;
  roc_1d: number;
  roc_5d: number;
  roc_20d: number;
  roc_60d: number;
  alignment: 'FULL_BULL' | 'FULL_BEAR' | 'PULLBACK' | 'BOUNCE' | 'MIXED';
  score: number; // 0-100 Strength
  reason: string;
}

class MomentumService {

  async analyzeMomentum(ticker: string): Promise<MomentumProfile> {
    try {
        // 1. Get Historical Data (Need 60+ days)
        const history = await historicalDataService.getStockHistory(ticker, 70);
        
        if (!history || history.length < 60) {
            return {
                ticker, roc_1d: 0, roc_5d: 0, roc_20d: 0, roc_60d: 0,
                alignment: 'MIXED', score: 50, reason: "Insufficient History"
            };
        }

        const prices = history.map(h => h.price);
        const current = prices[prices.length - 1];

        // 2. Calculate ROC (Rate of Change)
        const roc1d = this.calcROC(current, prices[prices.length - 2]);
        const roc5d = this.calcROC(current, prices[prices.length - 6]);
        const roc20d = this.calcROC(current, prices[prices.length - 21]);
        const roc60d = this.calcROC(current, prices[prices.length - 61]);

        // 3. Determine Alignment
        let alignment: MomentumProfile['alignment'] = 'MIXED';
        let score = 50;
        let reason = "";

        if (roc1d > 0 && roc5d > 0 && roc20d > 0 && roc60d > 0) {
            alignment = 'FULL_BULL';
            score = 90;
            reason = `SUPER TREND: All timeframes (1D/5D/20D/60D) are aligned UP.`;
        } else if (roc1d < 0 && roc5d < 0 && roc20d < 0 && roc60d < 0) {
            alignment = 'FULL_BEAR';
            score = 10;
            reason = `CRASH MODE: All timeframes aligned DOWN.`;
        } else if (roc60d > 0 && roc20d > 0 && roc5d < 0) {
            alignment = 'PULLBACK';
            score = 75;
            reason = `BUY THE DIP: Long-term trend UP, Short-term DOWN.`;
        } else if (roc60d < 0 && roc20d < 0 && roc5d > 0) {
            alignment = 'BOUNCE';
            score = 30;
            reason = `DEAD CAT BOUNCE: Long-term trend DOWN, Short-term UP.`;
        } else {
            score = 50 + (roc20d > 0 ? 10 : -10);
            reason = `Mixed Signals: 20D is ${roc20d > 0 ? 'UP' : 'DOWN'}.`;
        }

        return {
            ticker,
            roc_1d: roc1d,
            roc_5d: roc5d,
            roc_20d: roc20d,
            roc_60d: roc60d,
            alignment,
            score,
            reason
        };

    } catch (e) {
        return {
             ticker, roc_1d: 0, roc_5d: 0, roc_20d: 0, roc_60d: 0,
             alignment: 'MIXED', score: 50, reason: "Analysis Error"
        };
    }
  }

  private calcROC(current: number, past: number): number {
      if (!past) return 0;
      return ((current - past) / past) * 100;
  }
}

export default new MomentumService();
