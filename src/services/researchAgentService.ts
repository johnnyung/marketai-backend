import { pool } from '../db/index.js';
import Anthropic from '@anthropic-ai/sdk';
import { extractJSON } from '../utils/aiUtils.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY
});

class ResearchAgentService {

  async expandKnowledgeBase() {
    console.log('🕵️ Research Agent: Hunting for Micro-Catalysts & Specifics...');

    try {
      // FIXED: Use 'ai_summary' instead of 'title'
      const newsRes = await pool.query(`
        SELECT source_name, ai_summary
        FROM digest_entries
        WHERE created_at > NOW() - INTERVAL '24 hours'
        AND (
            ai_summary ILIKE '%acquire%' OR ai_summary ILIKE '%merger%' OR
            ai_summary ILIKE '%contract%' OR ai_summary ILIKE '%grant%' OR
            ai_summary ILIKE '%lobby%' OR ai_summary ILIKE '%bill passed%' OR
            ai_summary ILIKE '%insider%' OR ai_summary ILIKE '%fda%' OR
            ai_summary ILIKE '%patent%' OR ai_summary ILIKE '%lawsuit%'
        )
        ORDER BY ai_relevance_score DESC
        LIMIT 30
      `);

      if (newsRes.rows.length < 3) {
          // console.log("   ℹ️ No micro-catalysts found.");
          return { expanded: false, message: "No actionable clues." };
      }

      const clues = newsRes.rows.map(r => `[${r.source_name}]: ${r.ai_summary}`).join("\n");

      const prompt = `
        ACT AS: Elite Financial Investigator.
        RAW CLUES:
        ${clues.substring(0, 5000)}

        TASK: Find 3 hidden micro-catalysts.
        OUTPUT JSON:
        {
          "new_events": [
            {
              "event": "Event Name",
              "type": "Catalyst",
              "description": "Connection found",
              "affected_sectors": ["Sector"],
              "recovery_pattern": "Outcome",
              "keywords": ["tag"]
            }
          ]
        }
      `;

      const message = await anthropic.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }]
      });
      
      const text = message.content[0].type === 'text' ? message.content[0].text : '{}';
      const data = extractJSON(text);

      let addedCount = 0;
      if (data.new_events) {
          for (const evt of data.new_events) {
               try {
                   await pool.query(`
                      INSERT INTO historical_events (event, event_date, event_type, description, affected_sectors, recovery_pattern, keywords, collected_at)
                      VALUES ($1, NOW(), $2, $3, $4, $5, $6, NOW())
                   `, [evt.event, evt.type, evt.description, JSON.stringify(evt.affected_sectors), evt.recovery_pattern, evt.keywords]);
                   addedCount++;
               } catch(e) {}
          }
      }
      return { expanded: true, added: addedCount };

    } catch (error: any) {
      return { expanded: false, error: error.message };
    }
  }
}

export default new ResearchAgentService();
