import economicCalendarService from './economicCalendarService.js';
import { pool } from '../db/index.js';

interface ESIMetrics {
  score: number; // -100 to +100
  trend: 'HEATING' | 'COOLING' | 'NEUTRAL';
  recent_surprises: { event: string; deviation: number }[];
  favored_sectors: string[];
}

class EconomicSurpriseService {

  async calculateESI(): Promise<ESIMetrics> {
    console.log('      📊 ESI: Calculating Economic Surprise Index...');

    try {
        // 1. Get recent economic events with actual values
        // Query our local DB populated by economicCalendarService
        const res = await pool.query(`
            SELECT event_name, actual_value, forecast_value, importance
            FROM economic_events
            WHERE scheduled_date BETWEEN NOW() - INTERVAL '30 days' AND NOW()
            AND actual_value IS NOT NULL AND forecast_value IS NOT NULL
            AND importance IN ('high', 'medium')
        `);

        if (res.rows.length === 0) {
            return { score: 0, trend: 'NEUTRAL', recent_surprises: [], favored_sectors: [] };
        }

        let totalSurprise = 0;
        let count = 0;
        const surprises = [];

        for (const event of res.rows) {
            const actual = parseFloat(event.actual_value);
            const forecast = parseFloat(event.forecast_value);
            
            if (!isNaN(actual) && !isNaN(forecast) && forecast !== 0) {
                // Calculate percent deviation
                let deviation = ((actual - forecast) / Math.abs(forecast)) * 100;
                
                // Invert logic for "Bad is Good" metrics (Unemployment, Claims)
                if (event.event_name.toLowerCase().includes('unemployment') || event.event_name.toLowerCase().includes('jobless')) {
                    deviation = -deviation;
                }

                // Weight by importance
                const weight = event.importance === 'high' ? 2 : 1;
                totalSurprise += (deviation * weight);
                count += weight;

                if (Math.abs(deviation) > 5) {
                    surprises.push({ event: event.event_name, deviation: parseFloat(deviation.toFixed(2)) });
                }
            }
        }

        const esiScore = count > 0 ? (totalSurprise / count) : 0;
        
        // Normalize to -100 to 100 roughly
        const normalizedScore = Math.max(-100, Math.min(100, esiScore * 5));

        let trend: ESIMetrics['trend'] = 'NEUTRAL';
        let sectors: string[] = [];

        if (normalizedScore > 20) {
            trend = 'HEATING';
            sectors = ['Energy', 'Financial Services', 'Industrials']; // Inflation/Growth trade
        } else if (normalizedScore < -20) {
            trend = 'COOLING';
            sectors = ['Technology', 'Utilities', 'Consumer Defensive']; // Disinflation/Safety trade
        }

        console.log(`      -> ESI Score: ${normalizedScore.toFixed(2)} (${trend})`);

        return {
            score: parseFloat(normalizedScore.toFixed(2)),
            trend,
            recent_surprises: surprises.slice(0, 5),
            favored_sectors: sectors
        };

    } catch (e) {
        console.error("ESI Calc Error:", e);
        return { score: 0, trend: 'NEUTRAL', recent_surprises: [], favored_sectors: [] };
    }
  }
}

export default new EconomicSurpriseService();
