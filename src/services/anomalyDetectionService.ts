import pool from '../db/index.js';

// Keywords that imply high market impact/rarity
const HIGH_IMPACT_KEYWORDS = [
    'sanction', 'embargo', 'indictment', 'subpoena', 'raid',
    'halt', 'suspend', 'bankruptcy', 'default', 'restructure',
    'war', 'invasion', 'attack', 'breach', 'hack',
    'stimulus', 'emergency', 'bailout', 'rate hike', 'rate cut'
];

const MEDIUM_IMPACT_KEYWORDS = [
    'resignation', 'appointed', 'acquisition', 'merger', 'spinoff',
    'lawsuit', 'fine', 'penalty', 'recall', 'delay',
    'upgrade', 'downgrade', 'guidance', 'earnings beat', 'earnings miss'
];

class AnomalyDetectionService {

  // Calculate score based on Text and History
  async scoreEntry(title: string, summary: string, sourceType: string): Promise<{ score: number, type: string }> {
    let score = 0;
    const text = `${title} ${summary}`.toLowerCase();

    // 1. Rarity / Keyword Scan
    HIGH_IMPACT_KEYWORDS.forEach(w => { if (text.includes(w)) score += 25; });
    MEDIUM_IMPACT_KEYWORDS.forEach(w => { if (text.includes(w)) score += 10; });

    // 2. Source Weighting
    if (sourceType === 'insider_trade') score += 15;
    if (sourceType === 'political') score += 10;
    if (sourceType === 'crypto_whale') score += 10;

    // 3. Historical Precedent Check
    try {
        const history = await pool.query("SELECT keywords, market_impact FROM historical_events");
        for (const row of history.rows) {
            const keywords = row.keywords || [];
            if (keywords.some((k: string) => text.includes(k.toLowerCase()))) {
                 score += 10;
            }
        }
    } catch(e) {}

    // Normalize
    score = Math.min(100, Math.max(0, Math.round(score)));

    // Determine Type
    let type = 'standard';
    if (score >= 80) type = 'CRISIS_SIGNAL';
    else if (score >= 60) type = 'HIGH_IMPACT';
    else if (score >= 40) type = 'MODERATE';

    return { score, type };
  }

  // CRITICAL FIX: Select 'ai_summary', NOT 'title'
  async processRecentEntries() {
      try {
          const res = await pool.query(`
            SELECT id, ai_summary, source_type
            FROM digest_entries
            WHERE anomaly_score IS NULL OR anomaly_score = 0
            ORDER BY created_at DESC
            LIMIT 50
          `);
          
          let updated = 0;
          for (const row of res.rows) {
              // Pass ai_summary as both title and summary to the scorer
              const result = await this.scoreEntry(row.ai_summary, row.ai_summary, row.source_type);
              
              await pool.query(
                  "UPDATE digest_entries SET anomaly_score = $1, anomaly_type = $2 WHERE id = $3",
                  [result.score, result.type, row.id]
              );
              updated++;
          }
          if (updated > 0) console.log(`   🚨 Anomaly Detector: Scored ${updated} new entries.`);
      } catch (e: any) {
          console.error("Anomaly Processing Error:", e.message);
      }
  }

  // FIXED: Alias ai_summary as title for frontend compatibility
  async getTopAnomalies() {
      try {
          const res = await pool.query(`
            SELECT source_name, ai_summary as title, ai_summary, anomaly_score, anomaly_type, created_at, source_type
            FROM digest_entries
            WHERE created_at > NOW() - INTERVAL '48 hours'
            ORDER BY anomaly_score DESC
            LIMIT 10
          `);
          return res.rows;
      } catch (e) { return []; }
  }
  
  async getHeatmapData() {
      try {
          const res = await pool.query(`
            SELECT source_type, AVG(anomaly_score) as heat, COUNT(*) as volume
            FROM digest_entries
            WHERE created_at > NOW() - INTERVAL '24 hours'
            GROUP BY source_type
          `);
          return res.rows;
      } catch (e) { return []; }
  }
}

export default new AnomalyDetectionService();
