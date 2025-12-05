import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// --- ENVIRONMENT LOADING STRATEGY (PHASE E) ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '../'); // Points to project root

console.log('================================================');
console.log('🚀 [BOOT] MARKETAI SERVER v113.0');
console.log(`📂 [BOOT] Root Context: ${root}`);

// Load .env (Base)
dotenv.config({ path: path.join(root, '.env') });
// Load .env.local (Override)
dotenv.config({ path: path.join(root, '.env.local') });

if (process.env.FMP_API_KEY) {
    console.log(`✅ [BOOT] FMP_API_KEY detected (${process.env.FMP_API_KEY.substring(0,4)}...)`);
} else {
    console.error('❌ [BOOT] FMP_API_KEY IS MISSING.');
}
console.log('================================================');

// Import Routes
import authRoutes from './routes/auth.js';
import marketRoutes from './routes/market.js';
import aiTipsRoutes from './routes/aiTips.js';
import portfolioRoutes from './routes/userPortfolioRoutes.js';
import intelligenceRoutes from './routes/intelligence.js';
import debugEnvRoutes from './routes/debugEnv.js';
import debugFmpRoutes from './routes/debugFmp.js';
import newsRoutes from './routes/news.js';
import optionsRoutes from './routes/options.js';
import technicalRoutes from './routes/technical.js';
import brainRoutes from './routes/brain.js';
import analysisRoutes from './routes/analysisRoutes.js';
import ingestionRoutes from './routes/ingestionRoutes.js';
import healthRoutes from './routes/health.js';

// App Setup
const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/ai-tips', aiTipsRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/intelligence', intelligenceRoutes);
app.use('/api/brain', brainRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/ingest', ingestionRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/options', optionsRoutes);
app.use('/api/technical', technicalRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/my-portfolio', portfolioRoutes);
app.use('/api/debug', debugEnvRoutes);
app.use('/api/debug', debugFmpRoutes);
app.use('/health', healthRoutes);

// Base Route
app.get('/', (req, res) => {
    res.json({
        status: 'MarketAI Backend Online',
        env: process.env.NODE_ENV,
        auth_ready: !!process.env.JWT_SECRET,
        data_ready: !!process.env.FMP_API_KEY
    });
});

app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
});

export default app;
