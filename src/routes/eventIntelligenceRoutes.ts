// src/routes/eventIntelligenceRoutes.ts
import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import pool from '../db/index.js';
import axios from 'axios';
import * as cheerio from 'cheerio';

const router = express.Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY });

router.post('/analyze', async (req, res) => {
  const { articleUrl, userNotes, tickers } = req.body;

  try {
    // 1. Fetch and parse article
    const article = await fetchArticle(articleUrl);
    
    // 2. Get historical precedents from database
    const historicalEvents = await pool.query(`
      SELECT * FROM historical_events 
      ORDER BY event_date DESC LIMIT 50
    `);
    
    // 3. Get recent digest intelligence
    const recentIntelligence = await pool.query(`
      SELECT source_type, source_name, ai_summary, tickers, ai_sentiment, event_date
      FROM digest_entries
      WHERE event_date >= NOW() - INTERVAL '30 days'
      ORDER BY ai_relevance_score DESC LIMIT 100
    `);
    
    // 4. Get existing stock tips
    const stockTips = await pool.query(`
      SELECT ticker, action, reasoning, confidence, created_at
      FROM ai_stock_tips
      WHERE status = 'active'
      ORDER BY confidence DESC LIMIT 20
    `);
    
    // 5. Get pattern matches
    const patterns = await pool.query(`
      SELECT * FROM pattern_matches 
      ORDER BY detected_at DESC LIMIT 10
    `);

    // 6. AI Analysis with comprehensive context
    const analysis = await analyzeWithClaude({
      article,
      userNotes,
      suggestedTickers: tickers || [],
      historicalEvents: historicalEvents.rows,
      recentIntelligence: recentIntelligence.rows,
      stockTips: stockTips.rows,
      patterns: patterns.rows
    });

    // 7. Store analysis for future pattern matching
    await pool.query(`
      INSERT INTO event_analysis 
      (article_url, article_text, user_notes, ai_analysis, affected_tickers, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
    `, [
      articleUrl,
      article.text,
      userNotes,
      JSON.stringify(analysis),
      analysis.affectedTickers
    ]);

    res.json({ success: true, data: analysis });
    
  } catch (error: any) {
    console.error('Event analysis failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

async function fetchArticle(url: string) {
  const response = await axios.get(url, {
    timeout: 10000,
    headers: { 'User-Agent': 'MarketAI/1.0' }
  });
  
  const $ = cheerio.load(response.data);
  $('script, style, nav, footer, header').remove();
  
  const title = $('h1').first().text() || $('title').text();
  const text = $('article, .article-body, .story-body, main, .content').text() || $('body').text();
  
  return {
    title: title.trim(),
    text: text.trim().substring(0, 5000)
  };
}

async function analyzeWithClaude(context: any) {
  const prompt = `Analyze this event for investment opportunities using comprehensive market intelligence.

**ARTICLE:**
Title: ${context.article.title}
${context.article.text}

**USER NOTES:**
${context.userNotes}

**HISTORICAL PRECEDENTS (${context.historicalEvents.length} events):**
${JSON.stringify(context.historicalEvents.slice(0, 10), null, 2)}

**RECENT MARKET INTELLIGENCE (${context.recentIntelligence.length} entries):**
${JSON.stringify(context.recentIntelligence.slice(0, 20), null, 2)}

**ACTIVE AI STOCK TIPS (${context.stockTips.length} tips):**
${JSON.stringify(context.stockTips.slice(0, 10), null, 2)}

**PATTERN MATCHES:**
${JSON.stringify(context.patterns, null, 2)}

Return comprehensive analysis in EXACT JSON:
{
  "eventSummary": "2-3 sentence summary",
  "historicalPrecedent": {
    "matchedEvent": "Similar past event name",
    "date": "2018-05-15",
    "similarity": 85,
    "pastOutcome": "What happened to markets/sectors",
    "keyDifferences": ["difference 1", "difference 2"]
  },
  "sectorImpact": [
    {"sector": "Defense", "prediction": "bullish", "magnitude": 8, "reasoning": "why"},
    {"sector": "Oil & Gas", "prediction": "bearish", "magnitude": -3, "reasoning": "why"}
  ],
  "affectedTickers": [
    {
      "ticker": "BA",
      "recommendation": "BUY",
      "confidence": 78,
      "reasoning": "Specific rationale based on event",
      "targetPrice": 250,
      "timeframe": "3-6 months",
      "catalysts": ["catalyst 1", "catalyst 2"]
    }
  ],
  "riskFactors": [
    {"risk": "Risk description", "severity": "high", "mitigation": "How to handle"}
  ],
  "overallConfidence": 75,
  "tradingStrategy": "Specific actionable strategy",
  "timelinePrediction": {
    "immediate": "0-1 week outlook",
    "shortTerm": "1-4 weeks outlook",
    "mediumTerm": "1-3 months outlook"
  }
}

Base analysis on REAL data provided. Be specific with tickers and prices. Only valid JSON.`;

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }]
  });

  const text = msg.content[0].type === 'text' ? msg.content[0].text : '{}';
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleaned);
}

// Get recent analyses
router.get('/recent', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, article_url, user_notes, ai_analysis, affected_tickers, created_at
      FROM event_analysis
      ORDER BY created_at DESC
      LIMIT 20
    `);
    
    res.json({ success: true, data: result.rows });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
