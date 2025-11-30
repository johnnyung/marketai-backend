import pool from '../db/index.js';
import newsApiService from './newsApiService.js';
import sectorDiscoveryService from './sectorDiscoveryService.js'; // WIRED
import retailInterpretabilityService from './retailInterpretabilityService.js'; // WIRED
import { isValidTicker } from '../utils/tickerUtils.js';

class CatalystHunterService {

  async scan() { return this.huntInsiderPlays(); }

  async huntInsiderPlays() {
    console.log("      🦅 Catalyst Hunter: Scanning Expanded Universe...");
    const opportunities: any[] = [];
    
    // 1. Get Universe (Wide-Net)
    const universe = await sectorDiscoveryService.getExpandedUniverse();
    // Sample 50 random tickers to scan for catalysts (to avoid rate limits)
    const targets = universe.sort(() => 0.5 - Math.random()).slice(0, 50);

    // 2. Scan for News/Events
    for (const ticker of targets) {
        if (!isValidTicker(ticker)) continue;

        try {
            // Quick News Check
            const news = await newsApiService.getTickerNews(ticker, undefined, 2);
            if (news.length > 0) {
                const latest = news[0];
                // Simple keyword check for catalyst
                const text = (latest.title + " " + (latest.description || "")).toLowerCase();
                
                let type = "NONE";
                let score = 0;

                if (text.includes("earnings") || text.includes("guidance")) { type = "EARNINGS"; score = 80; }
                else if (text.includes("approval") || text.includes("fda")) { type = "REGULATORY"; score = 90; }
                else if (text.includes("contract") || text.includes("deal")) { type = "CONTRACT"; score = 75; }
                else if (text.includes("merger") || text.includes("acquisition")) { type = "M&A"; score = 85; }

                if (score > 0) {
                    const signal = {
                        ticker,
                        signal_type: type,
                        confidence: score,
                        thesis: `Catalyst Detected: ${latest.title}`,
                        catalyst_event: type,
                        retail_badges: [] // Placeholder
                    };
                    
                    // Generate Badges
                    // Mocking analysis object structure for the service
                    signal.retail_badges = retailInterpretabilityService.generateSimpleTags({
                        analysis: { confidence: score, action: 'BUY', decision_matrix: { engines: { narrative: { score: 80 } } } },
                        decision_matrix: { engines: { narrative: { score: 80 } } }
                    });

                    opportunities.push(signal);
                }
            }
        } catch (e) {}
        // Throttle
        await new Promise(r => setTimeout(r, 100));
    }

    await this.saveFindings(opportunities);
    return opportunities;
  }

  private async saveFindings(findings: any[]) {
      for (const f of findings) {
          try {
            await pool.query(`
                INSERT INTO hunter_findings (ticker, signal_type, confidence, thesis, catalyst_event, created_at)
                VALUES ($1, $2, $3, $4, $5, NOW())
            `, [f.ticker, f.signal_type, f.confidence, f.thesis, f.catalyst_event]);
          } catch(e) {}
      }
  }
  
  async getHunterHistory() {
      try {
          const res = await pool.query(`SELECT * FROM hunter_findings ORDER BY created_at DESC LIMIT 50`);
          return res.rows.map(r => ({ ticker: r.ticker, reasoning: r.thesis, created_at: r.created_at, catalyst: r.catalyst_event }));
      } catch(e) { return []; }
  }

  // Legacy validation method
  async validateTicker(ticker: string) {
      return { has_catalyst: false, confidence: 0, catalyst_details: "", catalyst_event: "" };
  }
}

export default new CatalystHunterService();
