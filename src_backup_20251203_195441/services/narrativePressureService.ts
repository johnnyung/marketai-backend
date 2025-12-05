import fmpService from './fmpService.js';
import { PressureMetrics } from '../types/intelligenceBundle.js';

class NarrativePressureService {
    async calculatePressure(ticker: string): Promise<PressureMetrics> {
        const news = await fmpService.getCompanyNews(ticker);
        
        if (news && news.length > 0) {
            const score = Math.min(100, news.length * 10);
            return {
                ticker,
                pressure_score: score,
                regime: score > 50 ? 'HYPE_CYCLE' : 'NORMAL',
                dominant_narrative: news[0].title,
                sources_breakdown: { social_velocity: 0, news_volume: score, political_heat: 0, institutional_urgency: 0 }
            };
        }

        // Synthetic: High Relative Volume = High Narrative Pressure
        const candles = await fmpService.getIntraday(ticker);
        if (candles && candles.length > 20) {
            // Check if latest volume is significantly higher than average
            const vols = candles.slice(0,10).map((c:any)=>c.volume);
            const avg = vols.reduce((a:any,b:any)=>a+b,0)/vols.length;
            const latest = candles[0].volume;
            const ratio = latest / (avg || 1);
            
            const score = Math.min(100, ratio * 40);
            return {
                ticker,
                pressure_score: Math.round(score),
                regime: score > 60 ? 'HYPE_CYCLE' : 'NORMAL',
                dominant_narrative: 'High Volume Interest',
                sources_breakdown: { social_velocity: 0, news_volume: 0, political_heat: 0, institutional_urgency: Math.round(score) }
            };
        }

        return { ticker, pressure_score: 0, regime: 'NORMAL', dominant_narrative: 'None', sources_breakdown: { social_velocity: 0, news_volume: 0, political_heat: 0, institutional_urgency: 0 } };
    }
}
export default new NarrativePressureService();
