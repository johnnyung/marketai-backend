export class TechnicalMath {
  
  static calculateSMA(data: number[], period: number): number | null {
    if (data.length < period) return null;
    const slice = data.slice(0, period);
    const sum = slice.reduce((a, b) => a + b, 0);
    return sum / period;
  }

  static calculateRSI(data: number[], period: number = 14): number | null {
    if (data.length < period + 1) return null;
    let gains = 0;
    let losses = 0;
    for (let i = data.length - period; i < data.length; i++) {
      const diff = data[i] - data[i - 1];
      if (diff >= 0) gains += diff;
      else losses -= diff;
    }
    let avgGain = gains / period;
    let avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  static calculateVolatility(data: number[]): number {
    if (data.length < 2) return 0;
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const variance = data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (data.length - 1);
    return Math.sqrt(variance);
  }

  static calculateBeta(stockReturns: number[], marketReturns: number[]): number {
    const n = Math.min(stockReturns.length, marketReturns.length);
    if (n < 10) return 1.0;
    const stock = stockReturns.slice(-n);
    const market = marketReturns.slice(-n);
    const avgStock = stock.reduce((a, b) => a + b, 0) / n;
    const avgMarket = market.reduce((a, b) => a + b, 0) / n;
    let covariance = 0;
    let variance = 0;
    for (let i = 0; i < n; i++) {
        covariance += (stock[i] - avgStock) * (market[i] - avgMarket);
        variance += Math.pow(market[i] - avgMarket, 2);
    }
    return variance === 0 ? 1.0 : covariance / variance;
  }

  static getReturns(prices: number[]): number[] {
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
        returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    return returns;
  }

  // NEW: Z-Score Calculation
  static calculateZScore(current: number, history: number[]): number {
    if (history.length < 2) return 0;
    const mean = history.reduce((a, b) => a + b, 0) / history.length;
    const stdDev = this.calculateVolatility(history); // Reuse volatility function for StdDev
    if (stdDev === 0) return 0;
    return (current - mean) / stdDev;
  }
}
