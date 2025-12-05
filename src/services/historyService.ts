import fmp from "./fmpService.js";

export default {
  async getDaily(ticker: string, days: number = 30) {
    return await fmp.getDailyCandles(ticker, days);
  },
  async getIntraday(ticker: string) {
    return await fmp.getIntraday(ticker);
  }
};
