import { pool } from '../db/index.js';
import Anthropic from '@anthropic-ai/sdk';
import { extractJSON } from '../utils/aiUtils.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY
});

interface HistoricalMatch {
  event_name: string;
  similarity_score: number; // 0-100
  outcome_summary: string;
  sector_impact: string[];
}

class HistoricalRAGEngine {

  // Match current market conditions to historical database
  async match(currentContext: string): Promise<HistoricalMatch[]> {
    console.log('      🏺 Historical RAG: Searching Vector Space...');
    
    try {
        // 1. Get Historical Events (The Knowledge Base)
        // In a full vector DB, we would query embeddings. Here we fetch and let LLM match.
        const historyRes = await pool.query(`
            SELECT event, description, recovery_pattern, affected_sectors
            FROM historical_events
            ORDER BY event_date DESC
            LIMIT 100
        `);
        
        if (historyRes.rows.length === 0) return [];

        const historyText = historyRes.rows.map(r =>
            `EVENT: ${r.event} | DESC: ${r.description} | OUTCOME: ${r.recovery_pattern}`
        ).join('\n');

        // 2. RAG Matching (LLM as Vector Engine)
        const prompt = `
            ACT AS: Financial Historian.
            
            CURRENT MARKET CONTEXT:
            ${currentContext.substring(0, 2000)}

            HISTORICAL ARCHIVE:
            ${historyText.substring(0, 10000)}

            TASK: Find the top 3 historical parallels.
            Calculate "Similarity Score" (0-100) based on macro/sector alignment.

            OUTPUT JSON ONLY:
            [
                {
                    "event_name": "Name from Archive",
                    "similarity_score": 85,
                    "outcome_summary": "What happened next?",
                    "sector_impact": ["Tech", "Energy"]
                }
            ]
        `;

        const msg = await anthropic.messages.create({
            model: 'claude-3-haiku-20240307',
            max_tokens: 1000,
            messages: [{ role: 'user', content: prompt }]
        });

        const text = msg.content[0].type === 'text' ? msg.content[0].text : '[]';
        const matches = extractJSON(text);
        
        if (Array.isArray(matches)) {
            const best = matches.filter(m => m.similarity_score > 60);
            if (best.length > 0) {
                console.log(`      -> 🕰️  RAG MATCH: ${best[0].event_name} (${best[0].similarity_score}%)`);
                
                // Log to Echo table
                await pool.query("DELETE FROM active_market_echoes"); // Keep fresh
                for (const m of best) {
                    await pool.query(`
                        INSERT INTO active_market_echoes (historical_event_name, resonance_score, narrative_parallel, affected_sectors)
                        VALUES ($1, $2, $3, $4)
                    `, [m.event_name, m.similarity_score, m.outcome_summary, JSON.stringify(m.sector_impact)]);
                }
            }
            return best;
        }
        return [];

    } catch (e) {
        console.error("RAG Engine Error:", e);
        return [];
    }
  }
}

export default new HistoricalRAGEngine();
