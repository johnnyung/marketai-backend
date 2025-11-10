// backend/src/services/intelligenceThreadsService.ts
// AI-powered Intelligence Threads - Connects related events into stories

import Anthropic from '@anthropic-ai/sdk';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY
});

class IntelligenceThreadsService {
  
  async generateThreads(hoursBack: number = 72) {
    console.log(`🧵 Generating intelligence threads...`);
    
    const entries = await this.getRecentEntries(hoursBack);
    console.log(`  ✓ Found ${entries.length} entries`);
    
    if (entries.length < 3) return [];
    
    const threads = await this.identifyThreadsWithAI(entries);
    console.log(`  ✓ Identified ${threads.length} threads`);
    
    await this.archiveOldThreads();
    
    for (const thread of threads) {
      await this.storeThread(thread);
    }
    
    return threads;
  }
  
  private async getRecentEntries(hoursBack: number) {
    const result = await pool.query(`
      SELECT id, source_type, source_name, ai_summary, ai_relevance_score,
             ai_sentiment, ai_entities_tickers, event_date
      FROM digest_entries
      WHERE event_date >= NOW() - INTERVAL '${hoursBack} hours'
        AND ai_relevance_score >= 60
      ORDER BY ai_relevance_score DESC
      LIMIT 200
    `);
    return result.rows;
  }
  
  private async identifyThreadsWithAI(entries: any[]) {
    const entriesSummary = entries.slice(0, 100).map((e, i) =>
      `[${i}] ${new Date(e.event_date).toISOString().split('T')[0]} | ${e.source_name} | ${e.ai_summary}`
    ).join('\n');
    
    const prompt = `Analyze these market events and identify 3-8 intelligence threads.

EVENTS:
${entriesSummary}

Respond with ONLY valid JSON:
{
  "threads": [
    {
      "title": "Brief title",
      "theme": "PHARMA",
      "impactLevel": "HIGH",
      "entryIndices": [0, 5, 12],
      "affectedTickers": [{"ticker": "MRK", "impact": "-2%", "reasoning": "..."}],
      "aiInsight": "2-3 sentences",
      "aiTradingImplication": "Specific trade idea",
      "aiRiskFactors": ["Risk 1"],
      "catalystsToWatch": [{"date": "Nov 15", "event": "...", "importance": "HIGH"}]
    }
  ]
}`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }]
    });
    
    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    
    return parsed.threads.map((t: any) => {
      const threadEntries = t.entryIndices.map((idx: number) => entries[idx]).filter(Boolean);
      const dates = threadEntries.map((e: any) => new Date(e.event_date).getTime());
      
      return {
        title: t.title,
        theme: t.theme,
        entryCount: threadEntries.length,
        timespanHours: Math.round((Math.max(...dates) - Math.min(...dates)) / (1000 * 60 * 60)),
        impactLevel: t.impactLevel,
        affectedTickers: t.affectedTickers,
        aiInsight: t.aiInsight,
        aiTradingImplication: t.aiTradingImplication,
        aiRiskFactors: t.aiRiskFactors,
        aiCatalystsToWatch: t.catalystsToWatch,
        overallRelevanceScore: Math.round(threadEntries.reduce((sum: number, e: any) => sum + e.ai_relevance_score, 0) / threadEntries.length),
        marketImpactScore: t.impactLevel === 'HIGH' ? 90 : 70,
        firstEventDate: new Date(Math.min(...dates)),
        lastEventDate: new Date(Math.max(...dates)),
        isFeatured: t.impactLevel === 'HIGH',
        entries: threadEntries
      };
    });
  }
  
  private async storeThread(thread: any) {
    const result = await pool.query(`
      INSERT INTO intelligence_threads (
        title, theme, entry_count, timespan_hours, impact_level,
        affected_tickers, ai_insight, ai_trading_implication,
        ai_risk_factors, ai_catalysts_to_watch,
        first_event_date, last_event_date,
        overall_relevance_score, market_impact_score,
        status, is_featured
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'ACTIVE', $15)
      RETURNING id
    `, [
      thread.title, thread.theme, thread.entryCount, thread.timespanHours,
      thread.impactLevel, JSON.stringify(thread.affectedTickers),
      thread.aiInsight, thread.aiTradingImplication,
      thread.aiRiskFactors, JSON.stringify(thread.aiCatalystsToWatch),
      thread.firstEventDate, thread.lastEventDate,
      thread.overallRelevanceScore, thread.marketImpactScore, thread.isFeatured
    ]);
    
    const threadId = result.rows[0].id;
    
    for (let i = 0; i < thread.entries.length; i++) {
      await pool.query(`
        INSERT INTO thread_entries (thread_id, entry_id, position_in_thread, entry_relevance)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (thread_id, entry_id) DO NOTHING
      `, [threadId, thread.entries[i].id, i, thread.entries[i].ai_relevance_score]);
    }
    
    return threadId;
  }
  
  private async archiveOldThreads() {
    await pool.query(`
      UPDATE intelligence_threads
      SET status = 'ARCHIVED'
      WHERE status = 'ACTIVE' AND last_event_date < NOW() - INTERVAL '7 days'
    `);
  }
  
  async getActiveThreads(limit: number = 10) {
    const result = await pool.query(`
      SELECT t.*, 
        json_agg(json_build_object(
          'id', e.id, 'source_name', e.source_name, 'ai_summary', e.ai_summary,
          'ai_sentiment', e.ai_sentiment, 'event_date', e.event_date
        ) ORDER BY te.position_in_thread) as entries
      FROM intelligence_threads t
      LEFT JOIN thread_entries te ON t.id = te.thread_id
      LEFT JOIN digest_entries e ON te.entry_id = e.id
      WHERE t.status = 'ACTIVE'
      GROUP BY t.id
      ORDER BY t.is_featured DESC, t.updated_at DESC
      LIMIT $1
    `, [limit]);
    return result.rows;
  }
  
  async getThreadById(id: number) {
    const result = await pool.query(`
      SELECT t.*, 
        json_agg(json_build_object(
          'id', e.id, 'source_name', e.source_name, 'ai_summary', e.ai_summary,
          'event_date', e.event_date
        ) ORDER BY te.position_in_thread) as entries
      FROM intelligence_threads t
      LEFT JOIN thread_entries te ON t.id = te.thread_id
      LEFT JOIN digest_entries e ON te.entry_id = e.id
      WHERE t.id = $1
      GROUP BY t.id
    `, [id]);
    return result.rows[0] || null;
  }
}

export default new IntelligenceThreadsService();
