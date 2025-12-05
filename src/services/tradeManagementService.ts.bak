import pool from '../db/index.js';
import paperTradingService from './paperTradingService.js';
import priceUpdaterService from './priceUpdaterService.js';

class TradeManagementService {
  async reviewPositions() {
      try {
          console.log('🔄 Trade Manager: Reviewing Active Positions...');
          await priceUpdaterService.updateAllOpenPositions();
          const portfolio = await paperTradingService.getPortfolioState();
          if (!portfolio || portfolio.positions.length === 0) return;

          for (const pos of portfolio.positions) {
              await this.evaluatePosition(pos, 1);
          }
      } catch (e) { console.error(e); }
  }

  private async evaluatePosition(pos: any, portfolioId: number) {
      if (pos.unrealizedPlPercent < -5.0) {
          await this.executeSell(portfolioId, pos.ticker, pos.shares, pos.currentPrice, 'Stop Loss Hit');
      }
  }

  private async executeSell(pid: number, ticker: string, shares: number, price: number, reason: string) {
      if ((paperTradingService as any).closePosition) {
          await (paperTradingService as any).closePosition(pid, ticker, price, reason);
      }
  }
}
export default new TradeManagementService();
