import pool from '../db/index.js';
import socialSentimentService from './socialSentimentService.js';

interface PressureMetrics {
  ticker: string;
  pressure_score: number; // 0-100 (Heat Index)
  regime: 'HYPE_CYCLE' | 'PANIC_CYCLE' | 'NEGLECTED' | 'NORMAL';
  dominant_narrative: string;
  sources_breakdown: {
      social_velocity: number;
      news_volume: number;
      political_heat: number;
      institutional_urgency: number;
  };
}

class NarrativePressureService {

  /**
   * Calculates the "Heat" of a ticker based on multi-source velocity.
   * High Pressure = High Volatility Imminent.
   */
  async calculatePressure(ticker: string): Promise<PressureMetrics> {
    // console.log(`      🗣️  Narrative Pressure: Gauging heat for ${ticker}...`);

    try {
        // 1. Social Velocity (Reddit/Twitter speed)
        // Returns % change in mentions vs baseline
        const socialVel = await socialSentimentService.getSentimentVelocity(ticker);
        
        // 2. News Volume (24h count)
        const newsRes = await pool.query(`
            SELECT COUNT(*) as count, STRING_AGG(ai_summary, ' | ') as text
            FROM digest_entries
            WHERE source_type = 'news'
            AND (ai_summary ILIKE $1 OR $1 = ANY(tickers))
            AND created_at > NOW() - INTERVAL '24 hours'
        `, [`%${ticker}%`]);
        
        const newsCount = parseInt(newsRes.rows[0].count) || 0;
        // Normalize news count (0-100, where 10 articles = 100)
        const newsScore = Math.min(100, newsCount * 10);

        // 3. Political Heat (Gov mentions)
        const govRes = await pool.query(`
            SELECT COUNT(*) as count
            FROM digest_entries
            WHERE source_type IN ('political', 'regulatory', 'geopolitical')
            AND (ai_summary ILIKE $1 OR $1 = ANY(tickers))
            AND created_at > NOW() - INTERVAL '48 hours'
        `, [`%${ticker}%`]);
        
        const govCount = parseInt(govRes.rows[0].count) || 0;
        const govScore = Math.min(100, govCount * 25); // High weight for politics

        // 4. Institutional Urgency (Dark pool / Insider)
        // (Stubbed for now, future integration with DarkPoolService)
        const instScore = 0;

        // 5. Aggregate Score
        // Weighted sum: Social (30%) + News (30%) + Political (40%)
        const totalScore = Math.round(
            (Math.abs(socialVel) * 0.3) +
            (newsScore * 0.3) +
            (govScore * 0.4)
        );

        // 6. Determine Regime
        let regime: PressureMetrics['regime'] = 'NORMAL';
        if (totalScore > 80) regime = socialVel > 0 ? 'HYPE_CYCLE' : 'PANIC_CYCLE';
        else if (totalScore < 10) regime = 'NEGLECTED';

        // 7. Extract Dominant Narrative (Simple keyword extraction from news)
        const textSample = newsRes.rows[0].text || "";
        let narrative = "No significant news flow.";
        if (textSample.includes("earnings")) narrative = "Earnings Volatility";
        if (textSample.includes("FDA") || textSample.includes("approval")) narrative = "Regulatory Decision";
        if (textSample.includes("merger") || textSample.includes("acquire")) narrative = "M&A Speculation";
        if (govScore > 0) narrative = "Political/Regulatory Pressure";

        const result: PressureMetrics = {
            ticker,
            pressure_score: Math.min(100, totalScore),
            regime,
            dominant_narrative: narrative,
            sources_breakdown: {
                social_velocity: socialVel,
                news_volume: newsScore,
                political_heat: govScore,
                institutional_urgency: instScore
            }
        };

        // 8. Log to DB
        await this.logPressure(ticker, result.pressure_score);

        return result;

    } catch (e: any) {
        // Fail safe
        return {
            ticker, pressure_score: 0, regime: 'NORMAL',
            dominant_narrative: "Data Error", sources_breakdown: { social_velocity: 0, news_volume: 0, political_heat: 0, institutional_urgency: 0 }
        };
    }
  }

  private async logPressure(ticker: string, score: number) {
      try {
          await pool.query(`
            INSERT INTO narrative_pressure_logs (ticker, pressure_score, created_at)
            VALUES ($1, $2, NOW())
          `, [ticker, score]);
      } catch(e) {}
  }
}

export default new NarrativePressureService();
