import pool from '../db/index.js';
import Anthropic from '@anthropic-ai/sdk';
import { extractJSON } from '../utils/aiUtils.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY
});

interface MarketEcho {
  event_name: string;
  resonance_score: number;
  narrative_parallel: string;
  affected_sectors: string[];
}

class MarketEchoService {

  async detectEchoes(): Promise<MarketEcho[]> {
    console.log('      🗣️  Market Echo: Listening for Historical Resonance...');

    try {
        // 1. Get Current Context (High Impact News)
        const newsRes = await pool.query(`
            SELECT source_name, ai_summary
            FROM digest_entries
            WHERE created_at > NOW() - INTERVAL '24 hours'
            AND ai_relevance_score > 70
            ORDER BY ai_relevance_score DESC
            LIMIT 15
        `);

        if (newsRes.rows.length < 5) return []; // Not enough noise to match pattern

        const currentNews = newsRes.rows.map(r => `[${r.source_name}] ${r.ai_summary}`).join('\n');

        // 2. Get Historical Context
        // We fetch all major events to let AI decide the best match
        const historyRes = await pool.query(`
            SELECT event, description, recovery_pattern
            FROM historical_events
            ORDER BY event_date DESC
        `);
        
        const historyDB = historyRes.rows.map(r => `EVENT: ${r.event} | DESC: ${r.description} | OUTCOME: ${r.recovery_pattern}`).join('\n');

        // 3. AI Pattern Matching
        const prompt = `
            ACT AS: Financial Historian.

            CURRENT NEWS CYCLE:
            ${currentNews.substring(0, 3000)}

            HISTORICAL ARCHIVE:
            ${historyDB.substring(0, 10000)}

            TASK:
            Compare the CURRENT NEWS to the HISTORICAL ARCHIVE.
            Do any specific historical events "Echo" today's situation? (e.g. inflation spikes, tech bubbles, war supply shocks).
            
            CRITERIA:
            - Resonance Score (0-100): How strong is the parallel?
            - Must be > 60 to report.

            OUTPUT STRICT JSON:
            {
                "echoes": [
                    {
                        "event_name": "Name of Historical Event from Archive",
                        "resonance_score": 85,
                        "narrative_parallel": "1 sentence explaining why today mimics this past event.",
                        "affected_sectors": ["Energy", "Tech"]
                    }
                ]
            }
        `;

        const msg = await anthropic.messages.create({
            model: 'claude-3-haiku-20240307',
            max_tokens: 1000,
            messages: [{ role: 'user', content: prompt }]
        });

        const text = msg.content[0].type === 'text' ? msg.content[0].text : '{}';
        const result = extractJSON(text);
        
        const echoes = result.echoes || [];

        // 4. Save & Log
        if (echoes.length > 0) {
            // Clear old echoes (we only care about the "Now")
            await pool.query("DELETE FROM active_market_echoes");
            
            for (const echo of echoes) {
                if (echo.resonance_score > 60) {
                    console.log(`      -> 🔔 ECHO DETECTED: ${echo.event_name} (${echo.resonance_score}% match)`);
                    await pool.query(`
                        INSERT INTO active_market_echoes (historical_event_name, resonance_score, narrative_parallel, affected_sectors)
                        VALUES ($1, $2, $3, $4)
                    `, [echo.event_name, echo.resonance_score, echo.narrative_parallel, JSON.stringify(echo.affected_sectors)]);
                }
            }
        }

        return echoes;

    } catch (e) {
        console.error("Market Echo Error:", e);
        return [];
    }
  }

  async getActiveEchoes() {
      try {
          const res = await pool.query("SELECT * FROM active_market_echoes ORDER BY resonance_score DESC");
          return res.rows;
      } catch(e) { return []; }
  }
}

export default new MarketEchoService();
