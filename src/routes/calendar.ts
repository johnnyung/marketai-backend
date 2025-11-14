import { Router } from 'express';
import { db } from '../db/index.js';

const router = Router();

// GET /api/calendar/events - Get economic calendar events
router.get('/events', async (req, res) => {
  try {
    const { startDate, endDate, category, importance, country } = req.query;

    let query = `
      SELECT id, event_name, country, category, importance, 
             scheduled_date, scheduled_time, actual_value, 
             forecast_value, previous_value, currency
      FROM economic_events
      WHERE scheduled_date >= CURRENT_DATE
    `;
    const params: any[] = [];

    if (startDate) {
      params.push(startDate);
      query += ` AND scheduled_date >= $${params.length}`;
    }
    if (endDate) {
      params.push(endDate);
      query += ` AND scheduled_date <= $${params.length}`;
    }
    if (category) {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }
    if (importance) {
      params.push(importance);
      query += ` AND importance = $${params.length}`;
    }
    if (country) {
      params.push(country);
      query += ` AND country = $${params.length}`;
    }

    query += ` ORDER BY scheduled_date ASC, scheduled_time ASC NULLS LAST`;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/calendar/today - Get today's events
router.get('/today', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, event_name, country, category, importance, 
              scheduled_date, scheduled_time, actual_value, 
              forecast_value, previous_value, currency
       FROM economic_events
       WHERE scheduled_date = CURRENT_DATE
       ORDER BY scheduled_time ASC NULLS LAST`,
      []
    );

    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/calendar/upcoming - Get upcoming week's events
router.get('/upcoming', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, event_name, country, category, importance, 
              scheduled_date, scheduled_time, actual_value, 
              forecast_value, previous_value, currency
       FROM economic_events
       WHERE scheduled_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
       ORDER BY scheduled_date ASC, scheduled_time ASC NULLS LAST`,
      []
    );

    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/calendar/seed - Populate calendar with upcoming events
router.post('/seed', async (req, res) => {
  try {
    // Clear old events
    await db.query('DELETE FROM economic_events WHERE scheduled_date < CURRENT_DATE', []);

    const today = new Date();
    const events = [
      // This week
      {
        event_name: 'Federal Reserve Interest Rate Decision',
        country: 'United States',
        category: 'Monetary Policy',
        importance: 'high',
        scheduled_date: new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        scheduled_time: '14:00',
        forecast_value: '5.25%',
        previous_value: '5.25%',
        currency: 'USD'
      },
      {
        event_name: 'Non-Farm Payrolls',
        country: 'United States',
        category: 'Employment',
        importance: 'high',
        scheduled_date: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        scheduled_time: '08:30',
        forecast_value: '180K',
        previous_value: '175K',
        currency: 'USD'
      },
      {
        event_name: 'Consumer Price Index (CPI)',
        country: 'United States',
        category: 'Inflation',
        importance: 'high',
        scheduled_date: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        scheduled_time: '08:30',
        forecast_value: '3.2%',
        previous_value: '3.1%',
        currency: 'USD'
      },
      {
        event_name: 'Initial Jobless Claims',
        country: 'United States',
        category: 'Employment',
        importance: 'medium',
        scheduled_date: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        scheduled_time: '08:30',
        forecast_value: '215K',
        previous_value: '210K',
        currency: 'USD'
      },
      {
        event_name: 'Retail Sales',
        country: 'United States',
        category: 'Consumer Spending',
        importance: 'high',
        scheduled_date: new Date(today.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        scheduled_time: '08:30',
        forecast_value: '0.3%',
        previous_value: '0.4%',
        currency: 'USD'
      },
      {
        event_name: 'Producer Price Index (PPI)',
        country: 'United States',
        category: 'Inflation',
        importance: 'medium',
        scheduled_date: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        scheduled_time: '08:30',
        forecast_value: '2.9%',
        previous_value: '2.8%',
        currency: 'USD'
      },
      {
        event_name: 'Industrial Production',
        country: 'United States',
        category: 'Manufacturing',
        importance: 'medium',
        scheduled_date: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        scheduled_time: '09:15',
        forecast_value: '0.2%',
        previous_value: '0.1%',
        currency: 'USD'
      },
      // Next week
      {
        event_name: 'Housing Starts',
        country: 'United States',
        category: 'Housing',
        importance: 'medium',
        scheduled_date: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        scheduled_time: '08:30',
        forecast_value: '1.43M',
        previous_value: '1.42M',
        currency: 'USD'
      },
      {
        event_name: 'ECB Interest Rate Decision',
        country: 'European Union',
        category: 'Monetary Policy',
        importance: 'high',
        scheduled_date: new Date(today.getTime() + 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        scheduled_time: '08:15',
        forecast_value: '4.00%',
        previous_value: '4.00%',
        currency: 'EUR'
      },
      {
        event_name: 'GDP Growth Rate',
        country: 'United States',
        category: 'Growth',
        importance: 'high',
        scheduled_date: new Date(today.getTime() + 9 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        scheduled_time: '08:30',
        forecast_value: '2.4%',
        previous_value: '2.1%',
        currency: 'USD'
      },
      {
        event_name: 'Durable Goods Orders',
        country: 'United States',
        category: 'Manufacturing',
        importance: 'medium',
        scheduled_date: new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        scheduled_time: '08:30',
        forecast_value: '0.5%',
        previous_value: '0.3%',
        currency: 'USD'
      },
      {
        event_name: 'Consumer Confidence Index',
        country: 'United States',
        category: 'Consumer Sentiment',
        importance: 'medium',
        scheduled_date: new Date(today.getTime() + 11 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        scheduled_time: '10:00',
        forecast_value: '102.0',
        previous_value: '100.5',
        currency: 'USD'
      },
      {
        event_name: 'Bank of Japan Interest Rate Decision',
        country: 'Japan',
        category: 'Monetary Policy',
        importance: 'high',
        scheduled_date: new Date(today.getTime() + 12 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        scheduled_time: '22:00',
        forecast_value: '-0.10%',
        previous_value: '-0.10%',
        currency: 'JPY'
      },
      {
        event_name: 'Personal Consumption Expenditures',
        country: 'United States',
        category: 'Inflation',
        importance: 'high',
        scheduled_date: new Date(today.getTime() + 13 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        scheduled_time: '08:30',
        forecast_value: '2.6%',
        previous_value: '2.5%',
        currency: 'USD'
      }
    ];

    // Insert all events
    for (const event of events) {
      await db.query(
        `INSERT INTO economic_events (
          event_name, country, category, importance, scheduled_date,
          scheduled_time, actual_value, forecast_value, previous_value, currency
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          event.event_name,
          event.country,
          event.category,
          event.importance,
          event.scheduled_date,
          event.scheduled_time,
          null, // actual_value
          event.forecast_value,
          event.previous_value,
          event.currency
        ]
      );
    }

    res.json({ 
      success: true, 
      message: `Seeded ${events.length} economic events`,
      count: events.length 
    });
  } catch (error: any) {
    console.error('Calendar seed error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/calendar/events - Add economic event (admin only)
router.post('/events', async (req, res) => {
  try {
    const {
      eventName,
      country,
      category,
      importance,
      scheduledDate,
      scheduledTime,
      actualValue,
      forecastValue,
      previousValue,
      currency
    } = req.body;

    const result = await db.query(
      `INSERT INTO economic_events (
        event_name, country, category, importance, scheduled_date,
        scheduled_time, actual_value, forecast_value, previous_value, currency
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [eventName, country, category, importance, scheduledDate, scheduledTime,
       actualValue, forecastValue, previousValue, currency]
    );

    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
