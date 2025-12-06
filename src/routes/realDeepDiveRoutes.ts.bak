// src/routes/realDeepDiveRoutes.ts
import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { pool } from '../db/index.js';

const router = express.Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY });

router.post('/analyze', async (req, res) => {
  const { ticker } = req.body;
  if (!ticker) return res.status(400).json({ success: false, error: 'Ticker required' });

  try {
    // Get real stock price from Alpha Vantage
    const priceResponse = await fetch(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${process.env.ALPHA_VANTAGE_API_KEY}`
    );
    const priceData = await priceResponse.json() as any;
    const currentPrice = parseFloat(priceData['Global Quote']?.['05. price'] || '0');
    
    // Get fundamental data from Alpha Vantage
    const fundamentalResponse = await fetch(
      `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${ticker}&apikey=${process.env.ALPHA_VANTAGE_API_KEY}`
    );
    const fundamentalData = await fundamentalResponse.json() as any;
    
    const marketCap = parseFloat(fundamentalData.MarketCapitalization || '0');
    const peRatio = parseFloat(fundamentalData.PERatio || '0');
    const eps = parseFloat(fundamentalData.EPS || '0');
    const profitMargin = parseFloat(fundamentalData.ProfitMargin || '0') * 100;
    const revenueGrowth = parseFloat(fundamentalData.QuarterlyRevenueGrowthYOY || '0') * 100;
    const debtToEquity = parseFloat(fundamentalData.DebtToEquity || '0');
    const companyName = fundamentalData.Name || `${ticker} Corporation`;
    
    // Get REAL data from database
    const news = await pool.query(`
      SELECT data_json, collected_at FROM raw_data_collection 
      WHERE source_type = 'news' 
      AND (data_json->>'title' ILIKE $1 OR data_json->>'description' ILIKE $1)
      ORDER BY collected_at DESC LIMIT 20
    `, [`%${ticker}%`]);

    const social = await pool.query(`
      SELECT data_json, collected_at FROM raw_data_collection 
      WHERE source_type = 'social' 
      AND (data_json->>'title' ILIKE $1 OR data_json->>'selftext' ILIKE $1)
      ORDER BY collected_at DESC LIMIT 20
    `, [`%${ticker}%`]);

    const sec = await pool.query(`
      SELECT data_json, collected_at FROM raw_data_collection 
      WHERE source_type = 'regulatory' 
      ORDER BY collected_at DESC LIMIT 10
    `);

    const historical = await pool.query(`
      SELECT * FROM historical_events ORDER BY collected_at DESC LIMIT 5
    `);

    // Build comprehensive prompt with REAL data
    const prompt = `Analyze ${ticker} using REAL market data below. Provide detailed 20-point analysis.

**COMPANY:** ${companyName}
**CURRENT PRICE:** $${currentPrice}
**MARKET CAP:** $${marketCap}
**P/E RATIO:** ${peRatio}
**EPS:** $${eps}
**PROFIT MARGIN:** ${profitMargin}%
**REVENUE GROWTH:** ${revenueGrowth}%
**DEBT/EQUITY:** ${debtToEquity}

**REAL NEWS (${news.rows.length} articles):**
${JSON.stringify(news.rows.slice(0, 10).map(r => r.data_json), null, 2)}

**REAL SOCIAL SENTIMENT (${social.rows.length} posts):**
${JSON.stringify(social.rows.slice(0, 10).map(r => r.data_json), null, 2)}

**REAL SEC FILINGS:**
${JSON.stringify(sec.rows.slice(0, 5).map(r => r.data_json), null, 2)}

**HISTORICAL PATTERNS:**
${JSON.stringify(historical.rows, null, 2)}

Return EXACT JSON with comprehensive 20-point analysis:
{
  "ticker": "${ticker}",
  "companyName": "${companyName}",
  "currentPrice": ${currentPrice},
  "priceChange": 0,
  "priceChangePercent": 0,
  "marketCap": ${marketCap},
  "volume": 0,
  "avgVolume": 0,
  "pe_ratio": ${peRatio},
  "eps": ${eps},
  "vettingScore": {
    "totalScore": 75,
    "breakdown": [
      {"category": "Fundamentals", "score": 4.2, "status": "pass", "details": "Based on P/E ${peRatio}, Margin ${profitMargin}%, Growth ${revenueGrowth}%"},
      {"category": "Competition", "score": 3.8, "status": "pass", "details": "Market position analysis from news"},
      {"category": "Management", "score": 4.5, "status": "pass", "details": "Leadership quality from recent actions"},
      {"category": "Political Risk", "score": 3.5, "status": "warning", "details": "Regulatory concerns if any"},
      {"category": "Sector Analysis", "score": 4.0, "status": "pass", "details": "Industry trends"}
    ]
  },
  "aiRecommendation": "BUY",
  "aiConfidence": 78,
  "aiReasoning": "Detailed reasoning based on ALL data above",
  "aiTargetPrice": ${currentPrice * 1.15},
  "aiRiskAssessment": "Risk level based on analysis",
  "fundamentals": {
    "revenue_growth": ${revenueGrowth},
    "profit_margins": ${profitMargin},
    "debt_to_equity": ${debtToEquity},
    "free_cash_flow": 0,
    "return_on_equity": 0,
    "quick_ratio": 0,
    "rating": "strong"
  },
  "technicals": {
    "rsi": 50,
    "macd": {"signal": "neutral", "strength": 50},
    "moving_averages": {"ma50": ${currentPrice * 0.98}, "ma200": ${currentPrice * 0.95}, "trend": "upward"},
    "support_levels": [${currentPrice * 0.95}, ${currentPrice * 0.90}, ${currentPrice * 0.85}],
    "resistance_levels": [${currentPrice * 1.05}, ${currentPrice * 1.10}, ${currentPrice * 1.15}],
    "volume_trend": "neutral",
    "rating": "neutral"
  },
  "sentiment": {
    "social_mentions": ${social.rows.length * 10},
    "sentiment_score": 0.65,
    "trending_rank": 50,
    "news_sentiment": "positive",
    "analyst_consensus": "Hold",
    "retail_interest": "moderate"
  },
  "competition": {
    "market_position": 1,
    "competitors": [],
    "competitive_advantages": ["Brand", "Technology", "Scale"],
    "market_share": 20,
    "industry_growth": 10
  },
  "management": {
    "ceo_rating": 4,
    "insider_ownership": 10,
    "recent_insider_trades": [],
    "management_changes": [],
    "execution_score": 75
  },
  "political": {
    "regulatory_risk": "moderate",
    "political_exposure": ["Policy risk"],
    "tariff_impact": 2,
    "government_contracts": 0
  },
  "supply_chain": {
    "vulnerability_score": 40,
    "key_suppliers": ["Unknown"],
    "geographic_exposure": [{"country": "US", "percentage": 60}],
    "disruption_risk": "moderate"
  },
  "patterns": {
    "similar_setups": [],
    "seasonality": [],
    "event_impact": [],
    "success_rate": 65
  }
}

Base ALL analysis on REAL data provided above. Be specific. Only valid JSON.`;

    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = msg.content[0].type === 'text' ? msg.content[0].text : '{}';
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const analysis = JSON.parse(cleaned);

    res.json({ success: true, data: analysis });
  } catch (error: any) {
    console.error('Deep dive error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
