// src/server.ts
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './db/index.js';

// Routes
import authRoutes from './routes/auth.js';
import digestRoutes from './routes/digest.js';
import aiTipsRoutes from './routes/aiTips.js';
import correlationRoutes from './routes/correlation.js';
import systemRoutes from './routes/system.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import aiRoutes from './routes/ai.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'healthy', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', database: 'disconnected' });
  }
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/digest', digestRoutes);
app.use('/api/ai-tips', aiTipsRoutes);
app.use('/api/correlation', correlationRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ai', aiRoutes);

// Stub routes for dashboard widgets
app.get('/api/event-intelligence/recent', (req, res) => {
  res.json({ success: true, data: [] });
});

app.get('/api/crypto-correlation/status', (req, res) => {
  res.json({ success: true, data: { status: 'active', accuracy: 0 } });
});

app.get('/api/market/price/:ticker', (req, res) => {
  res.json({ success: true, data: { price: 0, change: 0 } });
});

app.get('/api/ai-analysis/latest', (req, res) => {
  res.json({ success: true, data: [] });
});

// Collection endpoints → trigger real digest ingestion
app.post('/api/collect/*', async (req: any, res: any) => {
  try {
    const intelligentDigestService = (await import('./services/intelligentDigestService.js')).default;
    const result = await intelligentDigestService.ingestAndStore();
    res.json({ 
      success: true, 
      collected: result.stored,
      message: `Collected ${result.stored} entries` 
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/crypto-correlation/crypto/collect', async (req: any, res: any) => {
  try {
    const intelligentDigestService = (await import('./services/intelligentDigestService.js')).default;
    const result = await intelligentDigestService.ingestAndStore();
    res.json({ success: true, collected: result.stored });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Error handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    success: false, 
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message 
  });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📡 CORS enabled for: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
});
