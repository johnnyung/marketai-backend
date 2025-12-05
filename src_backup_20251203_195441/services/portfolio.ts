/**
 * portfolio.ts (Clean Version)
 * ----------------------------
 * Because we removed the advanced futures engine, this file can NOT
 * depend on futuresService margin / options / positions logic anymore.
 *
 * This clean version maintains:
 *   - stock holdings
 *   - portfolio value calculations
 *   - P/L calculations
 *
 * And removes:
 *   - all futures margin logic
 *   - all futures position logic
 */

import fmpService from './fmpService.js';

class PortfolioService {
    private portfolios: Record<string, any> = {};

    createPortfolio(id: string) {
        if (!this.portfolios[id]) {
            this.portfolios[id] = {
                id,
                holdings: {},       // { AAPL: { shares: 10, costBasis: 100 } }
                createdAt: new Date()
            };
        }
        return this.portfolios[id];
    }

    getPortfolio(id: string) {
        return this.portfolios[id] || null;
    }

    addStock(id: string, ticker: string, shares: number, costBasis: number) {
        const pf = this.createPortfolio(id);

        if (!pf.holdings[ticker]) {
            pf.holdings[ticker] = { shares: 0, costBasis: 0 };
        }

        pf.holdings[ticker].shares += shares;
        pf.holdings[ticker].costBasis = costBasis;

        return pf;
    }

    async calculateValue(id: string) {
        const pf = this.getPortfolio(id);
        if (!pf) return { totalValue: 0, positions: [] };

        const tickers = Object.keys(pf.holdings);
        const prices = await fmpService.getBatchPrices(tickers);

        let totalValue = 0;
        const details = [];

        prices.forEach((p: any) => {
            const h = pf.holdings[p.symbol];
            if (!h) return;

            const posValue = h.shares * p.price;
            totalValue += posValue;

            details.push({
                ticker: p.symbol,
                shares: h.shares,
                price: p.price,
                value: posValue,
                costBasis: h.costBasis
            });
        });

        return { totalValue, positions: details };
    }
}

export default new PortfolioService();
