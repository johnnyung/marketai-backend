import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';

// Routes
import authRoutes from './routes/auth.js';
import marketRoutes from './routes/market.js';
import newsRoutes from './routes/news.js';
import eventsRoutes from './routes/events.js';
import aiRoutes from './routes/ai.js';
import gameRoutes from './routes/game.js';
import futuresRoutes from './routes/futures.js';
import portfolioRoutes from './routes/portfolio.js';
import watchlistRoutes from './routes/watchlist.js';
import journalRoutes from './routes/journal.js';
import learningRoutes from './routes/learning.js';
import calendarRoutes from './routes/calendar.js';
import intelligenceRoutes from './routes/intelligence.js';
import dataRoutes from './routes/data.js';
import digestRoutes from './routes/digest.js';
import digestCleanupRoutes from './routes/digestCleanup.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for Railway
app.set('trust proxy', true);

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/futures', futuresRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/journal', journalRoutes);
app.use('/api/learning', learningRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/intelligence', intelligenceRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/digest', digestRoutes);
app.use('/api/digest', digestCleanupRoutes);

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════╗
║     MarketAI Backend Server           ║
║     🚀 Running on port ${PORT}         ║
╚═══════════════════════════════════════╝

Environment: ${process.env.NODE_ENV || 'development'}
Frontend:    ${process.env.FRONTEND_URL || 'http://localhost:3000'}
Database:    ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}

API Endpoints:
  Authentication:
  POST /api/auth/register
  POST /api/auth/login
  GET  /api/auth/me
  
  Futures Trading:
  GET  /api/futures/contracts
  POST /api/futures/open
  POST /api/futures/close
  GET  /api/futures/positions/:portfolioId
  
  Portfolio:
  GET  /api/portfolio
  POST /api/portfolio
  GET  /api/portfolio/:id/performance
  GET  /api/portfolio/:id/trades
  
  Market Data:
  GET  /api/market/price/:ticker
  GET  /api/news/latest
  POST /api/ai/chat

  📊 Data Intelligence:
  GET  /api/data/all              - All data sources
  GET  /api/digest/summary        - Digest statistics
  POST /api/digest/ingest         - Trigger data collection
  GET  /api/digest/entries        - Get digest entries
  GET  /api/digest/quality-report - Data quality report
  POST /api/digest/cleanup        - Clean bad data
  `);
});

export default app;
