// backend/src/routes/intelligenceThreadsRoutes.ts
import { Router } from 'express';
import { Pool } from 'pg';
import Anthropic from '@anthropic-ai/sdk';

const router = Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Generate intelligence threads from digest entries
router.post('/generate', async (req, res) => {
  try {
    console.log('🧵 Starting thread generation...');

    // Step 1: Get recent high-quality digest entries
    // FIXED: Use correct column names (ai_summary, source_name, etc.)
    const digestResult = await pool.query(`
      SELECT 
        id, 
        source_name, 
        ai_summary, 
        source_type,
        tickers, 
        ai_relevance_score, 
        ai_sentiment, 
        created_at
      FROM digest_entries
      WHERE ai_relevance_score >= 7
        AND created_at >= NOW() - INTERVAL '7 days'
      ORDER BY ai_relevance_score DESC, created_at DESC
      LIMIT 100
    `);

    const entries = digestResult.rows;
    console.log(`📊 Found ${entries.length} high-quality entries to analyze`);

    if (entries.length < 5) {
      return res.json({
        success: false,
        message: 'Not enough high-quality entries to generate threads',
        threadsCreated: 0
      });
    }

    // Step 2: Ask Claude to identify related events/threads
    const entrySummaries = entries.map((e, i) => 
      `${i + 1}. [Score: ${e.ai_relevance_score}/10] ${e.source_name}\n   Tickers: ${e.tickers || 'None'}\n   Summary: ${e.ai_summary?.substring(0, 200) || 'No summary'}`
    ).join('\n\n');

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: `Analyze these market intelligence entries and identify 3-5 major themes or "intelligence threads" - groups of related events that tell a bigger story.

INTELLIGENCE ENTRIES:
${entrySummaries}

For each thread, provide:
THREAD: [Short descriptive name]
ENTRIES: [Comma-separated list of entry numbers that belong to this thread]
IMPACT: [Brief description of why this thread matters]
TICKERS: [Comma-separated list of affected tickers]
---

Focus on threads with the most significant market impact and clearest connections between events.`
      }]
    });

    const claudeResponse = message.content[0].type === 'text' ? message.content[0].text : '';
    console.log('🤖 Claude identified threads');

    // Step 3: Parse threads from Claude's response
    const threadBlocks = claudeResponse.split('---').filter(b => b.trim());
    let threadsCreated = 0;

    for (const block of threadBlocks) {
      try {
        const threadName = block.match(/THREAD:\s*(.+)/)?.[1]?.trim();
        const entriesText = block.match(/ENTRIES:\s*(.+)/)?.[1]?.trim();
        const impact = block.match(/IMPACT:\s*(.+)/)?.[1]?.trim();
        const tickersText = block.match(/TICKERS:\s*(.+)/)?.[1]?.trim();

        if (!threadName || !entriesText) continue;

        // Parse entry IDs
        const entryIndices = entriesText.split(',').map(n => parseInt(n.trim()) - 1);
        const relatedEntryIds = entryIndices
          .filter(i => i >= 0 && i < entries.length)
          .map(i => entries[i].id);

        if (relatedEntryIds.length < 2) continue; // Need at least 2 connected entries

        // Parse tickers
        const tickers = tickersText 
          ? tickersText.split(',').map(t => t.trim()).filter(Boolean)
          : [];

        // Calculate aggregate sentiment
        const relatedEntries = entries.filter(e => relatedEntryIds.includes(e.id));
        const sentiments = relatedEntries.map(e => e.ai_sentiment).filter(Boolean);
        const dominantSentiment = sentiments.length > 0 
          ? sentiments.sort((a, b) => 
              sentiments.filter(s => s === b).length - sentiments.filter(s => s === a).length
            )[0]
          : 'neutral';

        // Calculate average relevance score
        const avgScore = relatedEntries.reduce((sum, e) => sum + (e.ai_relevance_score || 0), 0) / relatedEntries.length;

        // Insert thread
        await pool.query(`
          INSERT INTO intelligence_threads (
            thread_name, 
            description, 
            entry_ids, 
            affected_tickers, 
            thread_sentiment, 
            relevance_score,
            created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
          ON CONFLICT (thread_name) DO UPDATE SET
            description = EXCLUDED.description,
            entry_ids = EXCLUDED.entry_ids,
            affected_tickers = EXCLUDED.affected_tickers,
            thread_sentiment = EXCLUDED.thread_sentiment,
            relevance_score = EXCLUDED.relevance_score,
            created_at = EXCLUDED.created_at
        `, [
          threadName,
          impact || `Related events: ${relatedEntryIds.length} entries`,
          `{${relatedEntryIds.join(',')}}`, // PostgreSQL array format
          JSON.stringify(tickers),
          dominantSentiment,
          Math.round(avgScore)
        ]);

        threadsCreated++;
        console.log(`✅ Created thread: ${threadName} (${relatedEntryIds.length} entries)`);
      } catch (error) {
        console.error('Error creating thread:', error);
      }
    }

    console.log(`✅ Thread generation complete: ${threadsCreated} threads created`);

    res.json({
      success: true,
      threadsCreated,
      message: `Successfully created ${threadsCreated} intelligence threads`
    });

  } catch (error: any) {
    console.error('❌ Thread generation failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      threadsCreated: 0
    });
  }
});

// Get all threads
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM intelligence_threads
      ORDER BY created_at DESC
      LIMIT 50
    `);

    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching threads:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
