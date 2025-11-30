import pool from '../db/index.js';

class AdaptiveLearningService {
  
  // AI calls this to demand new data
  async setPriority(topic: string, source: string, score: number) {
    try {
      // Expire in 24 hours to keep focus fresh
      await pool.query(`
        INSERT INTO research_priorities (topic, source_hint, priority_score, expires_at)
        VALUES ($1, $2, $3, NOW() + INTERVAL '24 hours')
        ON CONFLICT (topic) DO UPDATE
        SET priority_score = research_priorities.priority_score + 1, expires_at = NOW() + INTERVAL '24 hours'
      `, [topic, source, score]);
      console.log(`   🧬 Evolution: AI is now hunting for "${topic}" in ${source}`);
    } catch(e) { console.error("Evolution Error", e); }
  }

  // Scrapers call this to get their orders
  async getPriorities(source_hint: string): Promise<string[]> {
    try {
      const res = await pool.query(`
        SELECT topic FROM research_priorities
        WHERE source_hint = $1 AND expires_at > NOW()
        ORDER BY priority_score DESC LIMIT 5
      `, [source_hint]);
      return res.rows.map(r => r.topic);
    } catch(e) { return []; }
  }
}

export default new AdaptiveLearningService();
