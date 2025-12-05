import { Router } from 'express';

const router = Router();

// GET /api/events/calendar - Get economic calendar
router.get('/calendar', async (req, res) => {
  // TODO: Integrate with economic calendar API
  // For now, return mock data
  res.json({
    events: [
      {
        id: 'evt-1',
        title: 'CPI (Core/Headline)',
        date: '2024-11-07',
        time: '8:30 AM ET',
        category: 'macro',
        importance: 'high',
      },
      {
        id: 'evt-2',
        title: 'Fed Chair Powell Remarks',
        date: '2024-11-08',
        time: '2:00 PM ET',
        category: 'policy',
        importance: 'high',
      },
    ],
  });
});

// GET /api/events/earnings - Get earnings calendar
router.get('/earnings', async (req, res) => {
  // TODO: Integrate with earnings calendar API
  res.json({
    earnings: [
      {
        ticker: 'NVDA',
        company: 'NVIDIA',
        date: '2024-11-20',
        time: 'After Market Close',
      },
    ],
  });
});

export default router;
