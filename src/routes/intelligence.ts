import { Router } from 'express';
import { db } from '../db/index.js';
import { authenticateToken } from '../middleware/auth.js';
import { claudeService } from '../services/claude.js';
import { newsService } from '../services/news.js';

const router = Router();

// Daily cache - stores one report per user per day
const dailyCache = new Map<string, { data: any; generatedAt: Date; date: string }>();

/**
 * Get cached intelligence if it exists for today, otherwise generate new
 */
router.get('/daily', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    
    // Validate userId
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const forceRefresh = req.query.refresh === 'true';
    const today = new Date().toDateString(); // e.g., "Wed Nov 06 2025"
    
    const cacheKey = `${userId}-${today}`;
    
    // Check if we have a cached report for today
    const cached = dailyCache.get(cacheKey);
    
    if (cached && !forceRefresh && cached.date === today) {
      // Return cached version
      console.log(`✅ Returning cached intelligence for user ${userId} from ${cached.generatedAt}`);
      return res.json({
        ...cached.data,
        cached: true,
        generatedAt: cached.generatedAt.toISOString(),
        canRefresh: true
      });
    }
    
    // Generate new intelligence
    console.log(`🔄 Generating NEW intelligence for user ${userId} (force: ${forceRefresh})`);
    
    const intelligence = await generateIntelligence(userId);
    
    // Cache it for the rest of the day
    dailyCache.set(cacheKey, {
      data: intelligence,
      generatedAt: new Date(),
      date: today
    });
    
    // Clean up old cache entries (older than yesterday)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();
    
    for (const [key, value] of dailyCache.entries()) {
      if (value.date < yesterdayStr) {
        dailyCache.delete(key);
      }
    }
    
    res.json({
      ...intelligence,
      cached: false,
      generatedAt: new Date().toISOString(),
      canRefresh: true
    });

  } catch (error: any) {
    console.error('Intelligence generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate intelligence',
      message: error.message 
    });
  }
});

/**
 * Generate intelligence report
 */
async function generateIntelligence(userId: number) {
  // 1. Gather all data sources
  const [calendarEvents, marketNews, userWatchlist, economicNews] = await Promise.all([
    // Get today's economic events
    db.query(`
      SELECT event_name, scheduled_date, scheduled_time, importance, 
             category, forecast_value, previous_value, country
      FROM economic_events
      WHERE scheduled_date = CURRENT_DATE
      ORDER BY scheduled_time
    `),
    
    // Get latest market news
    newsService.getLatestNews('stock market trading', 10),
    
    // Get user's watchlist
    db.query(`
      SELECT symbol, notes, price_alert_high, price_alert_low
      FROM watchlist
      WHERE user_id = $1
    `, [userId]),

    // Get economic/fed news
    newsService.getLatestNews('federal reserve economy CPI inflation', 8),
  ]);

  // 2. Get user's past trade patterns from journal
  const userTrades = await db.query(`
    SELECT ticker, strategy, outcome_notes, rating, tags, entry_date
    FROM trade_journal
    WHERE user_id = $1
    ORDER BY entry_date DESC
    LIMIT 10
  `, [userId]);

  // 3. Prepare comprehensive context for Claude
  const context = {
    date: new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }),
    economicEvents: calendarEvents.rows,
    marketNews: marketNews.slice(0, 10),
    economicNews: economicNews.slice(0, 8),
    userWatchlist: userWatchlist.rows,
    userTradeHistory: userTrades.rows,
    marketOpen: '9:30 AM ET',
    currentTime: new Date().toLocaleTimeString('en-US'),
  };

  // 4. Build AI analysis prompt
  const prompt = buildIntelligencePrompt(context);

  // 5. Get AI analysis from Claude
  const aiResponse = await claudeService.sendChatMessage({
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    max_tokens: 4000,
  });

  // 6. Parse AI response
  let intelligence;
  try {
    const responseText = aiResponse.content;
    const cleanedText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    intelligence = JSON.parse(cleanedText);
  } catch (parseError) {
    console.error('Failed to parse AI response:', parseError);
    
    // Fallback to basic structure if parsing fails
    intelligence = {
      marketBias: 'neutral',
      riskLevel: 'moderate',
      executiveSummary: aiResponse.content.substring(0, 500),
      opportunities: [],
      catalysts: calendarEvents.rows.map((e: any) => ({
        time: e.scheduled_time,
        event: e.event_name,
        impact: e.importance,
        category: e.category,
      })),
    };
  }

  // 7. Add raw data for frontend
  intelligence.rawData = {
    calendarEvents: calendarEvents.rows,
    newsCount: marketNews.length,
    watchlistCount: userWatchlist.rows.length,
  };

  return intelligence;
}

/**
 * Build comprehensive prompt for Claude AI analysis
 */
function buildIntelligencePrompt(context: any): string {
  return `You are an expert trading analyst providing a daily pre-market intelligence brief.

TODAY'S DATE: ${context.date}
CURRENT TIME: ${context.currentTime}
MARKET OPENS: ${context.marketOpen}

=== ECONOMIC EVENTS TODAY ===
${context.economicEvents.length > 0 
  ? context.economicEvents.map((e: any) => 
      `- ${e.scheduled_time}: ${e.event_name} (${e.importance.toUpperCase()} impact)
       Category: ${e.category}
       Forecast: ${e.forecast_value || 'N/A'} | Previous: ${e.previous_value || 'N/A'}
       Country: ${e.country}`
    ).join('\n')
  : 'No major economic events scheduled today.'
}

=== LATEST MARKET NEWS (Last 24 Hours) ===
${context.marketNews.map((news: any, i: number) => 
  `${i + 1}. ${news.title}
     Published: ${news.publishedAt}
     ${news.description || ''}`
).join('\n')}

=== ECONOMIC/FED NEWS ===
${context.economicNews.map((news: any, i: number) => 
  `${i + 1}. ${news.title}`
).join('\n')}

=== USER'S WATCHLIST ===
${context.userWatchlist.length > 0
  ? context.userWatchlist.map((w: any) => 
      `- ${w.symbol}: ${w.notes || 'No notes'}
       ${w.price_alert_high ? `Alert if above $${w.price_alert_high}` : ''}
       ${w.price_alert_low ? `Alert if below $${w.price_alert_low}` : ''}`
    ).join('\n')
  : 'User has no watchlist items.'
}

=== USER'S RECENT TRADES (Pattern Analysis) ===
${context.userTradeHistory.length > 0
  ? context.userTradeHistory.map((t: any) => 
      `- ${t.ticker}: ${t.strategy || 'Unknown strategy'} - Rating: ${t.rating || 'N/A'}/5
       Tags: ${t.tags?.join(', ') || 'None'}
       Outcome: ${t.outcome_notes?.substring(0, 100) || 'No notes'}`
    ).join('\n')
  : 'No recent trades to analyze.'
}

=== YOUR TASK ===
Provide a comprehensive pre-market intelligence brief. Analyze all the data above and respond with ONLY a valid JSON object (no markdown, no code blocks, just pure JSON) with this exact structure:

{
  "marketBias": "bullish" | "bearish" | "neutral",
  "biasStrength": 1-10,
  "riskLevel": "low" | "moderate" | "high",
  "executiveSummary": "2-3 sentence overview of today's market setup and key focus",
  "keyFocus": "Primary thing traders should watch today",
  "catalysts": [
    {
      "time": "8:30 AM",
      "event": "CPI Release",
      "impact": "high",
      "analysis": "What this means and historical patterns",
      "tradingImplication": "How traders should prepare",
      "affectedSectors": ["Technology", "Energy"]
    }
  ],
  "opportunities": [
    {
      "rank": 1,
      "ticker": "AAPL",
      "action": "LONG" | "SHORT" | "AVOID",
      "confidence": "HIGH" | "MEDIUM" | "LOW",
      "score": 85,
      "entry": "242-245",
      "target": "260",
      "stop": "238",
      "timeframe": "1-5 days",
      "reasoning": [
        "Specific reason 1",
        "Specific reason 2",
        "Specific reason 3"
      ],
      "risks": [
        "Risk 1",
        "Risk 2"
      ],
      "historicalContext": "When X happened historically, Y resulted",
      "newsContext": "Recent news summary supporting this play"
    }
  ],
  "watchlistAnalysis": [
    {
      "ticker": "symbol from user watchlist",
      "recommendation": "STRONG_BUY" | "BUY" | "HOLD" | "SELL" | "AVOID",
      "shortReason": "One sentence why",
      "priceAction": "What to watch for"
    }
  ],
  "riskAlerts": [
    "Specific risk or concern for today"
  ],
  "marketContext": {
    "sentiment": "Current market sentiment",
    "volatilityExpectation": "LOW" | "MODERATE" | "HIGH",
    "keyLevels": {
      "sp500": "Key support/resistance levels if relevant",
      "vix": "Volatility context"
    }
  },
  "strategicAdvice": [
    "Actionable advice point 1",
    "Actionable advice point 2"
  ]
}

CRITICAL RULES:
1. Provide 2-5 specific opportunities ranked by score (1 = best)
2. Each opportunity must have clear entry, target, and stop levels
3. Base analysis on the actual data provided above
4. For user's watchlist, provide specific actionable recommendations
5. Consider the economic events and how they historically impact markets
6. Be specific and actionable - avoid generic advice
7. Identify patterns in user's trading history and reference them
8. DO NOT use markdown code blocks - output pure JSON only
9. If limited data, focus on economic events and general market setup
10. Score opportunities 0-100 based on multiple factors

Respond with ONLY the JSON object, nothing else.`;
}

export default router;
