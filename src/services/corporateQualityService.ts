import fmpService from './fmpService.js';
import historicalDataService from './historicalDataService.js';

interface HealthScore {
  score: number; // 0-100
  rating: 'PRISTINE' | 'STABLE' | 'WEAK' | 'DISTRESSED';
  flags: string[];
  passed: boolean;
  dilution_pct: number;
}

class CorporateQualityService {

  async analyzeHealth(ticker: string): Promise<HealthScore> {
    const flags: string[] = [];
    let score = 100;

    // Skip check for Indices/ETFs/Crypto
    if (['SPY', 'QQQ', 'IWM', 'DIA', 'TLT', 'GLD', 'SLV', 'USO', 'XLK', 'XLE', 'XLF', 'XLV'].includes(ticker) || ticker.includes('USD')) {
        return { score: 100, rating: 'PRISTINE', flags: [], passed: true, dilution_pct: 0 };
    }

    try {
        const [ratios, income, balance, cashflow] = await Promise.all([
            fmpService.getFinancialRatios(ticker, 'annual', 1),
            fmpService.getIncomeStatement(ticker, 'annual', 2),
            fmpService.getBalanceSheet(ticker, 'quarter', 1),
            fmpService.getCashFlowStatement(ticker, 'annual', 1)
        ]);

        // --- RESILIENCE: INFER HEALTH FROM PRICE ---
        // If API fails to return financials, fallback to Price Analysis
        if (!ratios || ratios.length === 0) {
            return await this.inferHealthFromPrice(ticker);
        }

        const r = ratios[0];
        const bs = balance && balance.length > 0 ? balance[0] : null;
        const cf = cashflow && cashflow.length > 0 ? cashflow[0] : null;
        
        let dilution = 0;
        if (income && income.length >= 2) {
            const currentShares = income[0].weightedAverageShsOut;
            const prevShares = income[1].weightedAverageShsOut;
            if (prevShares > 0) dilution = ((currentShares - prevShares) / prevShares) * 100;
            if (dilution > 5.0) { score -= 15; flags.push(`Dilution: +${dilution.toFixed(1)}%`); }
            if (dilution > 20.0) { score -= 25; flags.push(`TOXIC DILUTION`); }
        }

        const interestCov = r.interestCoverage;
        if (interestCov !== null && interestCov < 1.5 && interestCov > -100) {
            score -= 20; flags.push(`Zombie Risk (Int Cov ${interestCov.toFixed(2)}x)`);
        }

        if (r.currentRatio < 0.8) { score -= 10; flags.push(`Liquidity Crunch`); }

        if (cf && cf.freeCashFlow < 0 && bs && bs.cashAndCashEquivalents < Math.abs(cf.freeCashFlow)) {
            score -= 20; flags.push(`Cash Runway Risk`);
        }

        if (r.debtEquityRatio > 5.0) { score -= 10; flags.push(`High Leverage`); }

        let rating: HealthScore['rating'] = 'PRISTINE';
        if (score < 50) rating = 'DISTRESSED';
        else if (score < 70) rating = 'WEAK';
        else if (score < 85) rating = 'STABLE';

        return { score, rating, flags, passed: score > 40, dilution_pct: dilution };

    } catch (e) {
        return { score: 50, rating: 'WEAK', flags: ['Check Failed'], passed: true, dilution_pct: 0 };
    }
  }

  // Fallback Method: If financials missing, check if market trusts it
  private async inferHealthFromPrice(ticker: string): Promise<HealthScore> {
      try {
          const history = await historicalDataService.getStockHistory(ticker, 200);
          if (history.length < 50) return { score: 50, rating: 'WEAK', flags: ['Data Unavailable'], passed: true, dilution_pct: 0 };
          
          const current = history[history.length-1].price;
          const sma200 = history.reduce((a,b) => a + b.price, 0) / history.length;
          
          // If price > 200SMA, market trusts it (bullish/stable)
          if (current > sma200) {
              return { score: 75, rating: 'STABLE', flags: ['Inferred from Uptrend'], passed: true, dilution_pct: 0 };
          } else {
              // If price < 200SMA, assume weakness
              return { score: 45, rating: 'WEAK', flags: ['Inferred from Downtrend', 'Missing Financials'], passed: true, dilution_pct: 0 };
          }
      } catch(e) {
          return { score: 50, rating: 'WEAK', flags: ['Data Unavailable'], passed: true, dilution_pct: 0 };
      }
  }
}

export default new CorporateQualityService();
