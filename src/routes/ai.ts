import { Router } from 'express';
import { claudeService } from '../services/claude.js';

const router = Router();

// POST /api/ai/chat - General chat
router.post('/chat', async (req, res) => {
  try {
    const { messages, system, max_tokens } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array required' });
    }

    const response = await claudeService.sendChatMessage({
      messages,
      system,
      max_tokens,
    });

    res.json(response);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai/summarize - Summarize news
router.post('/summarize', async (req, res) => {
  try {
    const { article } = req.body;
    
    if (!article) {
      return res.status(400).json({ error: 'article text required' });
    }

    const summary = await claudeService.summarizeNews(article);
    res.json({ summary });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai/analyze-trade - Analyze a trade decision
router.post('/analyze-trade', async (req, res) => {
  try {
    const { ticker, action, reasoning, currentPrice } = req.body;
    
    if (!ticker || !action || !reasoning || currentPrice === undefined) {
      return res.status(400).json({ 
        error: 'ticker, action, reasoning, and currentPrice required' 
      });
    }

    const analysis = await claudeService.analyzeTrade(
      ticker,
      action,
      reasoning,
      currentPrice
    );

    res.json({ analysis });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/ai/trading-advice - Get advice on a position
router.post('/trading-advice', async (req, res) => {
  try {
    const { ticker, buyPrice, currentPrice, shares } = req.body;
    
    if (!ticker || buyPrice === undefined || currentPrice === undefined || !shares) {
      return res.status(400).json({ 
        error: 'ticker, buyPrice, currentPrice, and shares required' 
      });
    }

    const advice = await claudeService.getTradingAdvice(
      ticker,
      buyPrice,
      currentPrice,
      shares
    );

    res.json({ advice });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
