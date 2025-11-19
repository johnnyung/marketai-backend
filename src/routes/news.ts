import { Router } from 'express';
import { newsService } from '../services/news.js';

const router = Router();

// GET /api/news/latest - Get latest market news
router.get('/latest', async (req, res) => {
  try {
    const query = req.query.q as string || 'stock market';
    const limit = parseInt(req.query.limit as string) || 10;
    
    const news = await newsService.getLatestNews(query, limit);
    res.json(news);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/news/company/:name - Get company-specific news
router.get('/company/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const limit = parseInt(req.query.limit as string) || 5;
    
    const news = await newsService.getCompanyNews(name, limit);
    res.json(news);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/news/headlines - Get top headlines
router.get('/headlines', async (req, res) => {
  try {
    const category = req.query.category as string || 'business';
    const limit = parseInt(req.query.limit as string) || 10;
    
    const headlines = await newsService.getTopHeadlines(category, limit);
    res.json(headlines);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
