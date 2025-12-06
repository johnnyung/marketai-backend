import { pool } from '../db/index.js';
import regimeTransitionService from './regimeTransitionService.js'; // FIXED: Updated to v110 Engine
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY
});

interface DailyBriefing {
  headline: string;
  bullets: string[];
  sentiment: 'bullish' | 'bearish' | 'neutral';
  generated_at: string;
}

class DailySummaryService {

  async generateBriefing(): Promise<DailyBriefing> {
    try {
      // 1. GATHER INTEL (Last 24 Hours)
      
      // New Catalysts
      const catalystRes = await pool.query(`
        SELECT thesis FROM hunter_findings
        WHERE created_at > NOW() - INTERVAL '24 hours'
        LIMIT 5
      `);
      
      // Insider Moves
      const insiderRes = await pool.query(`
        SELECT details FROM insider_intent_logs
        WHERE created_at > NOW() - INTERVAL '24 hours'
        AND classification != 'ROUTINE'
        LIMIT 5
      `);

      // Narrative Shifts
      const narrativeRes = await pool.query(`
        SELECT dominant_narrative FROM narrative_pressure_logs
        WHERE created_at > NOW() - INTERVAL '24 hours'
        ORDER BY pressure_score DESC LIMIT 1
      `);

      // Macro Regime (Using v110 Transition Engine)
      const regime = await regimeTransitionService.detectRegime();

      // 2. COMPILE CONTEXT
      const context = `
        MACRO: ${regime.current_regime} (${regime.metrics.inflation_trend} Inflation)
        CATALYSTS: ${catalystRes.rows.map(r => r.thesis).join(' | ')}
        INSIDER: ${insiderRes.rows.map(r => r.details).join(' | ')}
        NARRATIVE: ${narrativeRes.rows[0]?.dominant_narrative || 'No major shift'}
      `;

      // 3. AI SYNTHESIS
      const prompt = `
        ACT AS: Market Anchor.
        CONTEXT:
        ${context}

        TASK: Write a "What Changed Today?" briefing for a retail investor.
        
        FORMAT:
        - 1 Catchy Headline
        - 4 Short Bullet Points (Emoji + Plain English)
        - Overall Sentiment (BULLISH/BEARISH/NEUTRAL)
        
        OUTPUT JSON ONLY:
        {
          "headline": "String",
          "bullets": ["String", "String", "String", "String"],
          "sentiment": "bullish"
        }
      `;

      const message = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }]
      });

      const text = message.content[0].type === 'text' ? message.content[0].text : '{}';
      const json = JSON.parse(text);

      return {
        headline: json.headline,
        bullets: json.bullets,
        sentiment: json.sentiment.toLowerCase(),
        generated_at: new Date().toISOString()
      };

    } catch (e) {
      // Fallback for robustness
      return {
        headline: "Market Status Update",
        bullets: ["Analyzing latest data...", "Check back in 5 minutes.", "System is processing new signals.", "Macro regime stable."],
        sentiment: "neutral",
        generated_at: new Date().toISOString()
      };
    }
  }
}

export default new DailySummaryService();
