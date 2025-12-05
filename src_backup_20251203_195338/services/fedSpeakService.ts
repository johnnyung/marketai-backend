import pool from '../db/index.js';
import Anthropic from '@anthropic-ai/sdk';
import { extractJSON } from '../utils/aiUtils.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY
});

interface FedSignal {
  score: number; // -100 (Dovish) to +100 (Hawkish)
  tone: string;
  implication: string;
  actionable: boolean;
}

class FedSpeakService {

  async analyzeFedSpeeches(): Promise<FedSignal> {
    console.log('      🦅 Fed-Speak: Decoding Monetary Policy...');

    try {
        // 1. Get Political/Economic News
        const newsRes = await pool.query(`
            SELECT ai_summary
            FROM digest_entries
            WHERE (source_type = 'political' OR source_type = 'economic')
            AND (
                ai_summary ILIKE '%fed%' OR ai_summary ILIKE '%powell%' OR
                ai_summary ILIKE '%rates%' OR ai_summary ILIKE '%fomc%'
            )
            AND created_at > NOW() - INTERVAL '48 hours'
            LIMIT 10
        `);

        if (newsRes.rows.length === 0) {
            return { score: 0, tone: 'NEUTRAL', implication: 'No recent Fed chatter.', actionable: false };
        }

        const text = newsRes.rows.map(r => r.ai_summary).join('\n');

        // 2. LLM Decoder
        const prompt = `
            ACT AS: Central Bank Watcher.
            
            FED NEWS WIRE:
            ${text.substring(0, 3000)}

            TASK: Decode the "Fedspeak". Are they signaling tightening (Hawkish) or easing (Dovish)?
            Look for code words: "Transitory" (Dovish), "Persistent" (Hawkish), "Data-dependent" (Neutral/Delay).

            OUTPUT JSON ONLY:
            {
                "hawkish_score": 75,  // -100 to 100
                "key_phrase": "Higher for longer",
                "implied_move": "HIKE/CUT/PAUSE",
                "impact": "Negative for Tech, Positive for Dollar"
            }
        `;

        const msg = await anthropic.messages.create({
            model: 'claude-3-haiku-20240307',
            max_tokens: 500,
            messages: [{ role: 'user', content: prompt }]
        });

        const result = extractJSON(msg.content[0].type === 'text' ? msg.content[0].text : '{}');
        
        if (result.hawkish_score !== undefined) {
            console.log(`      -> 🦅 Fed Sentiment: ${result.hawkish_score} (${result.implied_move})`);
            
            // Save to DB
            await pool.query(`
                INSERT INTO fed_policy_signals (speaker, hawkish_score, key_phrase, implied_rate_move, market_impact_prediction)
                VALUES ('Consensus', $1, $2, $3, $4)
            `, [result.hawkish_score, result.key_phrase, result.implied_move, result.impact]);

            return {
                score: result.hawkish_score,
                tone: result.hawkish_score > 20 ? 'HAWKISH' : result.hawkish_score < -20 ? 'DOVISH' : 'NEUTRAL',
                implication: result.impact,
                actionable: true
            };
        }

        return { score: 0, tone: 'NEUTRAL', implication: 'Analysis Inconclusive', actionable: false };

    } catch (e) {
        console.error("Fed-Speak Error:", e);
        return { score: 0, tone: 'ERROR', implication: '', actionable: false };
    }
  }
}

export default new FedSpeakService();
