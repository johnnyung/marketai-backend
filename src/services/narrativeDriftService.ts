import { pool } from '../db/index.js';
import Anthropic from '@anthropic-ai/sdk';
import { extractJSON } from '../utils/aiUtils.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY
});

interface NarrativeSnapshot {
  theme: string;
  summary: string;
}

interface DriftAnalysis {
  drift_detected: boolean;
  shift_type: string; // e.g., "Bearish to Neutral", "Sector Rotation"
  drift_velocity: number; // 0-100 (Intensity of change)
  old_narrative: string;
  new_narrative: string;
  sectors_in: string[]; // Beneficiaries of the shift
  sectors_out: string[]; // Victims of the shift
  reasoning: string;
}

class NarrativeDriftService {

  // 1. Capture Today's Narrative
  async captureDailySnapshot() {
    try {
        // Get top news
        const newsRes = await pool.query(`
            SELECT title, ai_summary FROM digest_entries 
            WHERE created_at > NOW() - INTERVAL '24 hours'
            ORDER BY ai_relevance_score DESC LIMIT 30
        `);
        
        if (newsRes.rows.length < 5) return;

        const context = newsRes.rows.map(r => r.ai_summary).join('\n');
        
        // AI Summarization
        const prompt = `
            DATA:
            ${context.substring(0, 5000)}
            
            TASK: Summarize the "Global Market Narrative" right now in 2 sentences.
            Identify the single dominant theme (e.g. "AI Bubble Bursting", "Fed Pivot Hope").
            
            OUTPUT JSON:
            { "theme": "Title", "summary": "Description...", "keywords": ["tag1", "tag2"], "sentiment": 60 }
        `;
        
        const msg = await anthropic.messages.create({
             model: 'claude-3-haiku-20240307', max_tokens: 500, messages: [{ role: 'user', content: prompt }]
        });
        const json = extractJSON(msg.content[0].type === 'text' ? msg.content[0].text : '{}');
        
        if (json.theme) {
             await pool.query(`
                INSERT INTO narrative_snapshots (snapshot_date, dominant_theme, full_summary, top_keywords, sentiment_score)
                VALUES (CURRENT_DATE, $1, $2, $3, $4)
                ON CONFLICT (snapshot_date) DO UPDATE SET
                dominant_theme = $1, full_summary = $2, top_keywords = $3, sentiment_score = $4
             `, [json.theme, json.summary, json.keywords, json.sentiment]);
        }
    } catch (e) {}
  }

  // 2. Compare T-0 vs T-7
  async measureDrift(): Promise<DriftAnalysis | null> {
    console.log('      🌊 Narrative Drift: Analyzing Psychology Shifts...');
    
    try {
        // First, ensure today is captured
        await this.captureDailySnapshot();

        // Get Today
        const todayRes = await pool.query("SELECT * FROM narrative_snapshots WHERE snapshot_date = CURRENT_DATE");
        // Get Previous (closest to 7 days ago)
        const pastRes = await pool.query(`
            SELECT * FROM narrative_snapshots 
            WHERE snapshot_date < CURRENT_DATE - INTERVAL '5 days'
            ORDER BY snapshot_date DESC LIMIT 1
        `);

        if (todayRes.rows.length === 0 || pastRes.rows.length === 0) {
            return null;
        }

        const current = todayRes.rows[0];
        const past = pastRes.rows[0];

        const prompt = `
            ACT AS: Macro Strategist.
            
            PAST NARRATIVE (${new Date(past.snapshot_date).toDateString()}):
            Theme: ${past.dominant_theme}
            Summary: ${past.full_summary}
            
            CURRENT NARRATIVE (${new Date(current.snapshot_date).toDateString()}):
            Theme: ${current.dominant_theme}
            Summary: ${current.full_summary}
            
            TASK: Analyze the DRIFT. How has the market story changed?
            Identify sectors that benefit from this SPECIFIC shift.
            
            OUTPUT JSON:
            {
                "drift_detected": true,
                "shift_type": "Brief description of change (e.g. 'Fear to Greed')",
                "drift_velocity": 75,
                "sectors_in": ["Sector 1", "Sector 2"],
                "sectors_out": ["Sector 3"],
                "reasoning": "Why this shift matters."
            }
        `;

        const msg = await anthropic.messages.create({
             model: 'claude-3-haiku-20240307', max_tokens: 1000, messages: [{ role: 'user', content: prompt }]
        });
        
        const result = extractJSON(msg.content[0].type === 'text' ? msg.content[0].text : '{}');
        
        if (result.drift_detected) {
             console.log(`      -> 🌬️  DRIFT DETECTED: ${past.dominant_theme} -> ${current.dominant_theme}`);
             return {
                 ...result,
                 old_narrative: past.dominant_theme,
                 new_narrative: current.dominant_theme
             };
        }
        
        return null;

    } catch (e) {
        console.error("Narrative Drift Error:", e);
        return null;
    }
  }
}

export default new NarrativeDriftService();
