// backend/src/services/intelligenceThreadsService.ts
// AI-Powered Intelligence Thread Detection and Management

import Anthropic from '@anthropic-ai/sdk';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY
});

interface ThreadCreationCandidate {
  entries: any[];
  theme: string;
  confidence: number;
  reasoning: string;
}

class IntelligenceThreadsService {
  
  /**
   * Main thread detection - analyzes recent entries for connections
   */
  async detectAndCreateThreads(): Promise<number> {
    console.log('🧵 Starting thread detection...');
    
    // Get recent high-priority entries not yet in threads
    const entries = await this.getUnthreadedEntries();
    console.log(`  ✓ Found ${entries.length} unthreaded entries`);
    
    if (entries.length < 3) {
      console.log('  ⚠️  Not enough entries for thread detection');
      return 0;
    }
    
    // Use AI to detect potential threads
    const candidates = await this.detectThreadCandidates(entries);
    console.log(`  ✓ Detected ${candidates.length} potential threads`);
    
    // Create threads for high-confidence candidates
    let threadsCreated = 0;
    for (const candidate of candidates) {
      if (candidate.confidence >= 70 && candidate.entries.length >= 3) {
        await this.createThread(candidate);
        threadsCreated++;
      }
    }
    
    console.log(`  ✅ Created ${threadsCreated} new threads`);
    return threadsCreated;
  }
  
  /**
   * Get unthreaded high-priority entries from last 7 days
   * FIXED: Doesn't rely on thread_events table
   */
  private async getUnthreadedEntries() {
    const result = await pool.query(`
      SELECT 
        e.id,
        e.source_type,
        e.source_name,
        e.ai_summary,
        e.ai_relevance_score,
        e.ai_sentiment,
        e.ai_entities_tickers,
        e.event_date
      FROM digest_entries e
      WHERE e.event_date >= NOW() - INTERVAL '7 days'
        AND e.ai_relevance_score >= 70
        AND NOT EXISTS (
          SELECT 1 FROM intelligence_threads t 
          WHERE e.id = ANY(t.entry_ids)
        )
      ORDER BY e.ai_relevance_score DESC, e.event_date DESC
      LIMIT 100
    `);
    
    return result.rows;
  }
  
  /**
   * Use AI to detect thread candidates from entries
   */
  private async detectThreadCandidates(entries: any[]): Promise<ThreadCreationCandidate[]> {
    const entriesSummary = entries.map(e => 
      `[${e.id}] ${e.event_date.toISOString().split('T')[0]} | ${e.source_name}: ${e.ai_summary} (Score: ${e.ai_relevance_score})`
    ).join('\n');
    
    const prompt = `You are an expert market analyst detecting connected intelligence threads.

RECENT INTELLIGENCE ENTRIES:
${entriesSummary}

Analyze these entries and identify groups of 3+ events that are meaningfully connected - telling a coherent market story.

Look for:
- Cause-and-effect relationships
- Similar themes/sectors
- Geopolitical connections
- Supply chain linkages
- Regulatory domino effects
- Market sentiment shifts

For each thread you detect, provide:
- Which entry IDs belong together
- The connecting theme
- Confidence (0-100) this is a real pattern
- Brief reasoning why they're connected

Respond with ONLY valid JSON:
{
  "threads": [
    {
      "entry_ids": [123, 124, 125],
      "theme": "Brief theme description",
      "confidence": 85,
      "reasoning": "Why these events are connected"
    }
  ]
}`;

    try {
      const message = await anthropic.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 3000,
        messages: [{ role: 'user', content: prompt }]
      });
      
      const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
      const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      
      // Map entry IDs back to full entries
      const candidates: ThreadCreationCandidate[] = [];
      for (const thread of parsed.threads || []) {
        const threadEntries = entries.filter(e => thread.entry_ids.includes(e.id));
        if (threadEntries.length >= 3) {
          candidates.push({
            entries: threadEntries,
            theme: thread.theme,
            confidence: thread.confidence,
            reasoning: thread.reasoning
          });
        }
      }
      
      return candidates;
    } catch (error) {
      console.error('AI thread detection failed:', error);
      return [];
    }
  }
  
  /**
   * Create a new thread with AI-generated insights
   */
  private async createThread(candidate: ThreadCreationCandidate): Promise<number> {
    console.log(`  📝 Creating thread: ${candidate.theme}`);
    
    // Generate comprehensive thread analysis with AI
    const analysis = await this.generateThreadAnalysis(candidate);
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Store full analysis as JSON in description
      const descriptionData = JSON.stringify({
        theme: candidate.theme,
        insight: analysis.insight,
        tradingImplication: analysis.tradingImplication,
        riskFactors: analysis.riskFactors
      });
      
      // Create thread - FIXED to match database schema
      const entryIds = candidate.entries.map(e => e.id);
      const threadResult = await client.query(`
        INSERT INTO intelligence_threads (
          thread_name, description, status, affected_tickers, 
          thread_sentiment, relevance_score, entry_ids
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `, [
        analysis.title,
        descriptionData,  // Store full analysis as JSON
        'ACTIVE',
        JSON.stringify(analysis.affectedTickers),
        analysis.riskLevel || 'MEDIUM',
        candidate.confidence,
        entryIds
      ]);
      
      const threadId = threadResult.rows[0].id;
      
      // Note: Entry IDs are now stored in the entry_ids array column
      // No need for separate thread_events table
      
      await client.query('COMMIT');
      console.log(`  ✅ Created thread #${threadId}: ${analysis.title}`);
      
      return threadId;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Failed to create thread:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Generate comprehensive thread analysis with AI
   */
  private async generateThreadAnalysis(candidate: ThreadCreationCandidate) {
    const entriesContext = candidate.entries.map(e => 
      `${e.event_date.toISOString().split('T')[0]}: ${e.ai_summary}`
    ).join('\n');
    
    const prompt = `You are analyzing a connected intelligence thread in financial markets.

THEME: ${candidate.theme}

CONNECTED EVENTS:
${entriesContext}

Create a comprehensive thread analysis:

1. TITLE: Compelling 6-10 word thread title
2. INSIGHT: 2-3 sentence analysis of what's happening and why it matters
3. TRADING IMPLICATION: Specific actionable trading insight (2-3 sentences)
4. RISK FACTORS: 3-5 specific risks to watch
5. AFFECTED TICKERS: List of stock tickers most impacted
6. RISK LEVEL: LOW, MEDIUM, HIGH, or CRITICAL

Be specific, actionable, and insightful.

Respond with ONLY valid JSON:
{
  "title": "Thread title",
  "insight": "What's happening and why it matters",
  "tradingImplication": "Specific trading action or consideration",
  "riskFactors": ["risk 1", "risk 2", "risk 3"],
  "affectedTickers": ["AAPL", "MSFT"],
  "riskLevel": "HIGH"
}`;

    try {
      const message = await anthropic.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      });
      
      const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
      const cleaned = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      
      return parsed;
    } catch (error) {
      console.error('AI analysis generation failed:', error);
      // Return fallback
      return {
        title: candidate.theme,
        insight: 'Multiple related events detected. Further analysis in progress.',
        tradingImplication: 'Monitor developments closely.',
        riskFactors: ['Market volatility', 'Uncertain outcomes', 'Timing unclear'],
        affectedTickers: [],
        riskLevel: 'MEDIUM'
      };
    }
  }
  
  /**
   * Get all active threads - FIXED to map all fields frontend expects
   */
  async getActiveThreads() {
    const result = await pool.query(`
      SELECT 
        id, 
        thread_name,
        description,
        status,
        thread_sentiment,
        affected_tickers,
        entry_ids,
        relevance_score,
        created_at,
        updated_at
      FROM intelligence_threads
      WHERE status IN ('ACTIVE', 'MONITORING', 'active')
      ORDER BY updated_at DESC, relevance_score DESC
      LIMIT 20
    `);
    
    // Map database fields to frontend expectations
    return result.rows.map(row => {
      // Try to parse description as JSON (new format) or use as string (old format)
      let parsedDesc;
      try {
        parsedDesc = JSON.parse(row.description);
      } catch {
        parsedDesc = {
          theme: row.description || 'Market Intelligence',
          insight: row.description || 'AI-detected pattern from recent market events.',
          tradingImplication: 'Monitor affected tickers and related developments.',
          riskFactors: ['Market volatility', 'Uncertain outcomes']
        };
      }
      
      return {
        id: row.id,
        title: row.thread_name,
        theme: parsedDesc.theme || 'Market Intelligence',
        status: row.status,
        ai_insight: parsedDesc.insight || 'AI-detected pattern from recent market events.',
        ai_trading_implication: parsedDesc.tradingImplication || 'Monitor affected tickers and related developments.',
        ai_risk_factors: parsedDesc.riskFactors || ['Market volatility', 'Uncertain outcomes'],
        affected_tickers: row.affected_tickers || [],
        event_count: row.entry_ids?.length || 0,
        first_event_date: row.created_at,
        last_event_date: row.updated_at,
        risk_level: row.thread_sentiment || 'MEDIUM',
        confidence_score: row.relevance_score || 0
      };
    });
  }
  
  /**
   * Get thread by ID with all events - FIXED to map all fields frontend expects
   */
  async getThreadById(threadId: number) {
    // Get thread details
    const threadResult = await pool.query(`
      SELECT 
        id, 
        thread_name,
        description,
        status,
        thread_sentiment,
        affected_tickers,
        entry_ids,
        relevance_score,
        created_at,
        updated_at
      FROM intelligence_threads
      WHERE id = $1
    `, [threadId]);
    
    if (threadResult.rows.length === 0) {
      return null;
    }
    
    const thread = threadResult.rows[0];
    
    // Try to parse description as JSON (new format) or use as string (old format)
    let parsedDesc;
    try {
      parsedDesc = JSON.parse(thread.description);
    } catch {
      parsedDesc = {
        theme: thread.description || 'Market Intelligence',
        insight: thread.description || 'AI-detected pattern from recent market events.',
        tradingImplication: 'Monitor affected tickers closely for trading opportunities.',
        riskFactors: ['Market volatility', 'Timing uncertainty', 'External factors']
      };
    }
    
    // Get all events from entry_ids array
    let entries: any[] = [];
    if (thread.entry_ids && thread.entry_ids.length > 0) {
      const eventsResult = await pool.query(`
        SELECT 
          id,
          source_name,
          ai_summary,
          event_date,
          ai_relevance_score,
          ai_sentiment
        FROM digest_entries
        WHERE id = ANY($1)
        ORDER BY event_date DESC
      `, [thread.entry_ids]);
      
      entries = eventsResult.rows.map(e => ({
        id: e.id,
        entry_id: e.id,
        source_name: e.source_name,
        ai_summary: e.ai_summary,
        event_date: e.event_date,
        relevance_score: e.ai_relevance_score,
        ai_sentiment: e.ai_sentiment
      }));
    }
    
    // Map to frontend expected structure
    return {
      id: thread.id,
      title: thread.thread_name,
      theme: parsedDesc.theme || 'Market Intelligence',
      status: thread.status,
      ai_insight: parsedDesc.insight || 'AI-detected pattern from recent market events.',
      ai_trading_implication: parsedDesc.tradingImplication || 'Monitor affected tickers closely for trading opportunities.',
      ai_risk_factors: parsedDesc.riskFactors || ['Market volatility', 'Timing uncertainty', 'External factors'],
      affected_tickers: thread.affected_tickers || [],
      event_count: entries.length,
      first_event_date: thread.created_at,
      last_event_date: thread.updated_at,
      risk_level: thread.thread_sentiment || 'MEDIUM',
      confidence_score: thread.relevance_score || 0,
      entries: entries,
      events: entries  // Provide both for compatibility
    };
  }
  
  /**
   * Update thread status
   */
  async updateThreadStatus(threadId: number, status: string): Promise<void> {
    await pool.query(`
      UPDATE intelligence_threads
      SET status = $1, updated_at = NOW()
      WHERE id = $2
    `, [status, threadId]);
  }
}

export default new IntelligenceThreadsService();
