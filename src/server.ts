import express from 'express';
import cors from 'cors';

import aiTipsRoutes from './routes/aiTips.js';
import marketRoutes from './routes/market.js';
import intelligenceRoutes from './routes/intelligence.js';
import portfolioRoutes from './routes/portfolio.js';
import futuresRoutes from './routes/futures.js';
import technicalRoutes from './routes/technicalRoutes.js';

const app = express();

app.use(cors());
app.use(express.json());

// Explicit route mounting — no index file needed
app.use('/api/aiTips', aiTipsRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/intelligence', intelligenceRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/futures', futuresRoutes);
app.use('/api/technical', technicalRoutes);

// Health check
app.get('/api/health', (_req, res) => {
    res.json({ status: "ok", timestamp: Date.now() });
});

// Required for Railway
const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

export default app;
