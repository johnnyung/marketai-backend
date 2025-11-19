// src/services/economicCalendarService.ts
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

interface FinnhubEconomicEvent {
  event: string;
  country: string;
  impact: string; // 'low', 'medium', 'high'
  date: string; // ISO date
  actual: string | null;
  estimate: string | null;
  prev: string | null;
}

class EconomicCalendarService {
  
  /**
   * Fetch upcoming economic events from Finnhub
   */
  async fetchAndStoreEvents(): Promise<{ success: boolean; count: number; message: string }> {
    if (!FINNHUB_API_KEY) {
      console.error('❌ FINNHUB_API_KEY not configured');
      return { success: false, count: 0, message: 'API key not configured' };
    }

    try {
      console.log('📅 Fetching economic calendar from Finnhub...');
      
      // Get events from today to 30 days out
      const fromDate = new Date().toISOString().split('T')[0];
      const toDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const response = await fetch(
        `https://finnhub.io/api/v1/calendar/economic?from=${fromDate}&to=${toDate}&token=${FINNHUB_API_KEY}`
      );

      if (!response.ok) {
        throw new Error(`Finnhub API error: ${response.status}`);
      }

    const data: any = await response.json();
    const events: FinnhubEconomicEvent[] = data.economicCalendar || [];
      
      console.log(`  ✓ Received ${events.length} events from Finnhub`);

      if (events.length === 0) {
        return { success: true, count: 0, message: 'No events returned from API' };
      }

      // Clear old events
      await pool.query('DELETE FROM economic_events WHERE scheduled_date < CURRENT_DATE', []);

      // Store events
      let inserted = 0;
      for (const event of events) {
        try {
          // Normalize importance
          const importance = this.normalizeImportance(event.impact);
          
          // Determine category
          const category = this.categorizeEvent(event.event);

          await pool.query(`
            INSERT INTO economic_events (
              event_name,
              country,
              category,
              importance,
              scheduled_date,
              scheduled_time,
              actual_value,
              forecast_value,
              previous_value,
              currency
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            ON CONFLICT (event_name, scheduled_date) DO UPDATE
            SET 
              actual_value = EXCLUDED.actual_value,
              forecast_value = EXCLUDED.forecast_value,
              previous_value = EXCLUDED.previous_value
          `, [
            event.event,
            event.country || 'US',
            category,
            importance,
            event.date,
            null, // Finnhub doesn't provide time
            event.actual,
            event.estimate,
            event.prev,
            this.getCurrency(event.country)
          ]);
          
          inserted++;
        } catch (err) {
          console.error(`  ✗ Failed to insert event: ${event.event}`, err);
        }
      }

      console.log(`  ✓ Stored ${inserted} events`);
      
      return { 
        success: true, 
        count: inserted, 
        message: `Successfully fetched ${inserted} economic events` 
      };

    } catch (error: any) {
      console.error('❌ Economic calendar fetch failed:', error);
      return { 
        success: false, 
        count: 0, 
        message: error.message 
      };
    }
  }

  /**
   * Normalize importance level
   */
  private normalizeImportance(impact: string): string {
    const lower = (impact || '').toLowerCase();
    if (lower === 'high' || lower === '3') return 'high';
    if (lower === 'medium' || lower === '2') return 'medium';
    return 'low';
  }

  /**
   * Categorize event by name
   */
  private categorizeEvent(eventName: string): string {
    const name = eventName.toLowerCase();
    
    if (name.includes('interest rate') || name.includes('fed') || name.includes('fomc')) {
      return 'Monetary Policy';
    }
    if (name.includes('gdp') || name.includes('growth')) {
      return 'Growth';
    }
    if (name.includes('cpi') || name.includes('ppi') || name.includes('inflation')) {
      return 'Inflation';
    }
    if (name.includes('payroll') || name.includes('unemployment') || name.includes('jobless')) {
      return 'Employment';
    }
    if (name.includes('retail') || name.includes('consumer') || name.includes('spending')) {
      return 'Consumer Spending';
    }
    if (name.includes('manufacturing') || name.includes('pmi') || name.includes('ism')) {
      return 'Manufacturing';
    }
    if (name.includes('housing') || name.includes('home')) {
      return 'Housing';
    }
    if (name.includes('trade') || name.includes('balance')) {
      return 'Trade';
    }
    
    return 'Economic Indicator';
  }

  /**
   * Get currency for country
   */
  private getCurrency(country: string): string {
    const currencies: Record<string, string> = {
      'US': 'USD',
      'EU': 'EUR',
      'GB': 'GBP',
      'JP': 'JPY',
      'CH': 'CHF',
      'CA': 'CAD',
      'AU': 'AUD',
      'NZ': 'NZD'
    };
    return currencies[country] || 'USD';
  }

  /**
   * Get event context for AI analysis
   */
  async getUpcomingEventsContext(): Promise<string> {
    try {
      const result = await pool.query(`
        SELECT 
          event_name,
          country,
          importance,
          scheduled_date,
          forecast_value,
          previous_value
        FROM economic_events
        WHERE scheduled_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
          AND importance IN ('high', 'medium')
        ORDER BY scheduled_date ASC, importance DESC
        LIMIT 20
      `);

      if (result.rows.length === 0) {
        return 'No major economic events scheduled in the next 7 days.';
      }

      const context = result.rows.map(e => {
        const date = new Date(e.scheduled_date).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        });
        return `${date} - ${e.event_name} (${e.country}, ${e.importance}): Forecast ${e.forecast_value || 'N/A'}, Prev ${e.previous_value || 'N/A'}`;
      }).join('\n');

      return `UPCOMING ECONOMIC EVENTS (Next 7 Days):\n${context}`;
    } catch (error) {
      console.error('Failed to get events context:', error);
      return 'Economic calendar data unavailable.';
    }
  }
}

export default new EconomicCalendarService();
