import pool from '../db/index.js';
import Anthropic from '@anthropic-ai/sdk';
import { extractJSON } from '../utils/aiUtils.js';
import { isValidTicker } from '../utils/tickerUtils.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY
});

interface ChainSignal {
  level: 'L1' | 'L2' | 'L3';
  ticker: string;
  action: 'BUY' | 'SELL';
  thesis: string;
  confidence: number;
  origin_event: string;
}

class ChainReactionService {

  async detectChains(): Promise<ChainSignal[]> {
    console.log('   🔗 Chain Detector: Mapping downstream impacts...');

    try {
        // FIXED: Select 'ai_summary' instead of 'title'
        // Also fetching 'source_name' for better context
        const anomalies = await pool.query(`
          SELECT source_name, ai_summary
          FROM digest_entries
          WHERE anomaly_score >= 60
          AND created_at > NOW() - INTERVAL '24 hours'
          LIMIT 3
        `);

        if (anomalies.rows.length === 0) return [];

        const signals: ChainSignal[] = [];

        for (const event of anomalies.rows) {
            // Use ai_summary as the event description
            const description = `[${event.source_name}] ${event.ai_summary}`;
            const chains = await this.simulateRippleEffect(description, event.ai_summary);
            
            if (chains.length > 0) {
                console.log(`      -> Mapped ${chains.length} reactions for: "${event.ai_summary.substring(0,40)}..."`);
                signals.push(...chains);
            }
        }

        return signals;
    } catch (e) {
        console.error("Chain Detection Error:", e);
        return [];
    }
  }

  private async simulateRippleEffect(title: string, summary: string): Promise<ChainSignal[]> {
      const prompt = `
        EVENT: "${title}"
        DETAILS: "${summary.substring(0, 500)}"

        TASK: Trace the economic chain reaction (L1 -> L2 -> L3).
        
        DEFINITIONS:
        - L1 (Primary): Directly affected companies.
        - L2 (Secondary): Suppliers, Competitors, or Substitutes.
        - L3 (Tertiary): Macro/Consumer downstream effects.

        EXAMPLE (Oil Embargo):
        L1: Oil Majors (XOM) -> BUY
        L2: Airlines (UAL) -> SELL (Fuel costs up)
        L3: Solar (TAN) -> BUY (Alternative energy demand)

        OUTPUT JSON ONLY:
        {
            "chains": [
                { "level": "L2", "ticker": "SYM", "action": "BUY", "thesis": "Reasoning based on L1 event", "confidence": 85 }
            ]
        }
      `;

      try {
          const msg = await anthropic.messages.create({
              model: 'claude-3-haiku-20240307',
              max_tokens: 1000,
              messages: [{ role: 'user', content: prompt }]
          });
          const text = msg.content[0].type === 'text' ? msg.content[0].text : '{}';
          const json = extractJSON(text);
          
          const validChains: ChainSignal[] = [];
          if (json.chains && Array.isArray(json.chains)) {
              for (const c of json.chains) {
                  if (isValidTicker(c.ticker)) {
                      validChains.push({
                          ...c,
                          origin_event: summary.substring(0, 100)
                      });
                  }
              }
          }
          return validChains;
      } catch (e) { return []; }
  }
}

export default new ChainReactionService();
