import fmpService from './fmpService.js';

class SeasonalityEngine {
  async analyze(ticker: string) {
    try {
        const history = await fmpService.getDailyCandles(ticker, 100);
        if (!history || history.length < 20) return { score: 50, month_name: 'Current', avg_return_pct: 0, win_rate_pct: 0, trend: 'NEUTRAL', details: [] };

        const start = history[history.length-1].close;
        const end = history[0].close;
        const trend = end > start ? 'BULLISH' : 'BEARISH';
        
        return {
            score: trend === 'BULLISH' ? 70 : 30,
            month_name: 'Current',
            avg_return_pct: ((end-start)/start)*100,
            win_rate_pct: 50,
            trend,
            details: ['Recent Trend Analysis']
        };
    } catch (e) {
        return { score: 50, month_name: 'Error', avg_return_pct: 0, win_rate_pct: 0, trend: 'NEUTRAL', details: [] };
    }
  }
}
export default new SeasonalityEngine();
