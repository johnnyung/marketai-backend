import { pool } from '../db/index.js';
import Anthropic from '@anthropic-ai/sdk';
import { extractJSON } from '../utils/aiUtils.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY
});

interface NarrativeAnalysis {
  ticker: string;
  narrative_score: number; // 0-100
  sentiment_layer: {
    headline_shock: number;
    body_nuance: number;
    political_framing: string;
  };
  conviction_boost: number;
  summary: string;
}

class NarrativeSentimentService {

  async analyze(ticker: string): Promise<NarrativeAnalysis> {
    // 1. Gather recent context (FIXED: Removed 'title', used 'ai_summary' and 'source_name')
    try {
        const newsRes = await pool.query(`
            SELECT source_name, ai_summary, source_type
            FROM digest_entries
            WHERE (ai_summary ILIKE $1 OR source_name ILIKE $1)
            AND created_at > NOW() - INTERVAL '48 hours'
            LIMIT 10
        `, [`%${ticker}%`]);

        if (newsRes.rows.length === 0) {
            return {
                ticker, narrative_score: 50, conviction_boost: 0, summary: "No recent narrative.",
                sentiment_layer: { headline_shock: 5, body_nuance: 5, political_framing: 'neutral' }
            };
        }

        // Map using available columns
        const context = newsRes.rows.map(r => `[${r.source_type}] ${r.source_name}: ${r.ai_summary}`).join('\n');

        // 2. Deep Psychological Profile Prompt
        const prompt = `
          ACT AS: Behavioral Finance Psychologist.
          TARGET: ${ticker}
          
          NEWS FLOW:
          ${context.substring(0, 4000)}

          TASK: Analyze the "Narrative Strength".
          
          OUTPUT JSON ONLY:
          {
            "narrative_score": 85,
            "headline_shock": 8,
            "body_nuance": 9,
            "political_framing": "supportive",
            "conviction_boost": 10,
            "summary": "1 sentence explaining the psychological driver."
          }
        `;

        const msg = await anthropic.messages.create({
            model: 'claude-3-haiku-20240307',
            max_tokens: 500,
            messages: [{ role: 'user', content: prompt }]
        });
        
        const text = msg.content[0].type === 'text' ? msg.content[0].text : '{}';
        const json = extractJSON(text);

        return {
            ticker,
            narrative_score: json.narrative_score || 50,
            sentiment_layer: {
                headline_shock: json.headline_shock || 5,
                body_nuance: json.body_nuance || 5,
                political_framing: json.political_framing || 'neutral'
            },
            conviction_boost: json.conviction_boost || 0,
            summary: json.summary || "Analysis failed"
        };

    } catch (e) {
        // Fail gracefully without crashing the engine
        console.error(`   ⚠️ Narrative Analysis Error for ${ticker}:`, e);
        return {
            ticker, narrative_score: 50, conviction_boost: 0, summary: "Service Error",
            sentiment_layer: { headline_shock: 5, body_nuance: 5, political_framing: 'neutral' }
        };
    }
  }
}

export default new NarrativeSentimentService();
