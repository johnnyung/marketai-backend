import pool from '../db/index.js';
import fmpService from './fmpService.js';

interface CalendarRisk {
  isRisk: boolean;
  riskLevel: 'NONE' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  penalty: number; // Deduction from confidence score
  reason: string;
  imminentEvents: string[];
}

class GlobalCalendarService {

  // Syncs external FMP data into our risk calendar
  async syncCalendar() {
      try {
          // 1. Get Economic Calendar
          const eco = await fmpService.getEconomicIndicator('CPI'); // Proxy check
          // In a real scenario, we'd parse the full calendar. 
          // For V1, we rely on the seeded table + dynamic logic.
      } catch(e) {}
  }

  async assessRisk(ticker: string, sector: string): Promise<CalendarRisk> {
    const risk: CalendarRisk = {
        isRisk: false,
        riskLevel: 'NONE',
        penalty: 0,
        reason: '',
        imminentEvents: []
    };

    try {
        // 1. Check Database for Upcoming Events (Next 3 Days)
        const res = await pool.query(`
            SELECT event_name, event_type, impact_scope, risk_level, event_date
            FROM global_risk_calendar
            WHERE event_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 days'
        `);

        if (res.rows.length === 0) return risk;

        for (const event of res.rows) {
            let applies = false;
            
            // Scope Check
            if (event.impact_scope === 'GLOBAL') applies = true;
            if (event.impact_scope === 'ENERGY' && (sector === 'Energy' || ticker === 'XLE' || ticker === 'OXY')) applies = true;
            if (event.impact_scope === 'TECH' && (sector === 'Technology' || ticker === 'QQQ' || ticker === 'NVDA')) applies = true;
            if (event.impact_scope === 'CRYPTO' && (ticker === 'BTC' || ticker === 'COIN')) applies = true;

            if (applies) {
                risk.isRisk = true;
                risk.imminentEvents.push(`${event.event_name} (${new Date(event.event_date).toISOString().split('T')[0]})`);
                
                // Determine Severity
                // T-0 (Today/Tomorrow) = CRITICAL
                const daysUntil = Math.ceil((new Date(event.event_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                
                if (daysUntil <= 1) {
                    risk.riskLevel = 'CRITICAL';
                    risk.penalty = Math.max(risk.penalty, 25); // -25 Confidence
                } else if (daysUntil <= 3) {
                    risk.riskLevel = risk.riskLevel === 'CRITICAL' ? 'CRITICAL' : 'HIGH';
                    risk.penalty = Math.max(risk.penalty, 15); // -15 Confidence
                }
            }
        }

        if (risk.isRisk) {
            risk.reason = `[CALENDAR RISK] ${risk.riskLevel} volatility warning: ${risk.imminentEvents.join(', ')}.`;
        }

        return risk;

    } catch (e) {
        console.error("Calendar Risk Error", e);
        return risk;
    }
  }
}

export default new GlobalCalendarService();
