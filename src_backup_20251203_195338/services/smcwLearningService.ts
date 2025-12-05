import pool from '../db/index.js';
import economicCalendarService from './economicCalendarService.js';

interface SeasonalProfile {
  month: string;
  is_fomc: boolean;
  is_earnings: boolean;
  confidence_modifier: number;
  historical_win_rate: number;
  volatility_factor: number;
  reason: string;
}

class SmcwLearningService {
  
  private cache: SeasonalProfile | null = null;
  private lastUpdate = 0;

  async getCurrentSeasonality(): Promise<SeasonalProfile> {
    // Cache for 4 hours (Macro changes slowly)
    if (this.cache && (Date.now() - this.lastUpdate < 14400000)) return this.cache;

    try {
        const now = new Date();
        const month = now.toLocaleString('default', { month: 'short' }).toUpperCase();
        
        // Check Calendar for FOMC
        // Simple check for now, ideally check economic_events table for 'Fed Interest Rate'
        const events = await economicCalendarService.getUpcomingEventsContext();
        const isFomc = events.toLowerCase().includes('fomc') || events.toLowerCase().includes('federal reserve');
        
        // Check Earnings Season (Jan, Apr, Jul, Oct are peak)
        const mIdx = now.getMonth();
        const isEarnings = [0, 3, 6, 9].includes(mIdx);

        // Fetch Profile
        const res = await pool.query(`
            SELECT confidence_modifier, avg_win_rate, volatility_factor
            FROM seasonal_learning_snapshots
            WHERE month_key = $1
            ORDER BY sample_size DESC LIMIT 1
        `, [month]);

        const data = res.rows[0] || { confidence_modifier: 1.0, avg_win_rate: 50, volatility_factor: 1.0 };
        let modifier = parseFloat(data.confidence_modifier);

        // Dynamic Adjustments
        if (isFomc) modifier *= 0.9; // Reduce confidence during Fed week
        if (isEarnings) modifier *= 0.95; // Slight reduction for earnings volatility

        const profile: SeasonalProfile = {
            month,
            is_fomc: isFomc,
            is_earnings: isEarnings,
            confidence_modifier: parseFloat(modifier.toFixed(2)),
            historical_win_rate: parseFloat(data.avg_win_rate),
            volatility_factor: parseFloat(data.volatility_factor || 1.0),
            reason: `Seasonality: ${month} Base x${data.confidence_modifier}. FOMC: ${isFomc}. Earnings: ${isEarnings}.`
        };

        this.cache = profile;
        this.lastUpdate = Date.now();
        return profile;

    } catch (e) {
        return { month: 'UNK', is_fomc: false, is_earnings: false, confidence_modifier: 1.0, historical_win_rate: 50, volatility_factor: 1.0, reason: "Error" };
    }
  }
}

export default new SmcwLearningService();
