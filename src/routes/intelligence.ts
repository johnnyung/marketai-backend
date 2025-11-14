// backend/src/routes/intelligence.ts
import { Router } from 'express';
import signalGeneratorService from '../services/signalGeneratorService.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

// Generate fresh AI signals (saves to database automatically)
router.post('/generate-signals', authenticateToken, async (req, res) => {
  try {
    console.log('🚀 Generating AI signals...');
    const signals = await signalGeneratorService.generateDailySignals();
    
    res.json({ 
      success: true, 
      signals, 
      count: signals.length,
      message: `Generated ${signals.length} signals with REAL prices`
    });
  } catch (error: any) {
    console.error('Signal generation failed:', error);
    res.status(500).json({ 
      success: false,
      error: 'Signal generation failed', 
      message: error.message 
    });
  }
});

// Get latest signals from database
router.get('/signals', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 5;
    const signals = await signalGeneratorService.getLatestSignals(limit);
    
    res.json({ 
      success: true, 
      signals, 
      count: signals.length 
    });
  } catch (error: any) {
    console.error('Failed to get signals:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get signals', 
      message: error.message 
    });
  }
});

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'intelligence',
    timestamp: new Date().toISOString()
  });
});

export default router;
