import { pool } from '../db/index.js';
import Anthropic from '@anthropic-ai/sdk';
import { extractJSON } from '../utils/aiUtils.js';
import fmpService from './fmpService.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY
});

interface BeneficiaryNode {
  ticker: string;
  sector: string;
  order: 1 | 2 | 3;
  logic: string;
  confidence: number;
}

class BeneficiaryRouterService {

  async mapOpportunities(): Promise<BeneficiaryNode[]> {
    console.log('      🗺️  Beneficiary Router: Mapping 2nd/3rd Order Effects...');
    const opportunities: BeneficiaryNode[] = [];

    try {
        // 1. Get High Impact News
        const newsRes = await pool.query(`
            SELECT source_name, ai_summary
            FROM digest_entries
            WHERE created_at > NOW() - INTERVAL '24 hours'
            AND ai_relevance_score >= 85
            ORDER BY ai_relevance_score DESC
            LIMIT 3
        `);

        if (newsRes.rows.length === 0) return [];

        const events = newsRes.rows.map(r => `[${r.source_name}]: ${r.ai_summary}`).join('\n');

        // 2. AI Causal Mapping
        const prompt = `
            ACT AS: Global Macro Strategist.

            HIGH IMPACT EVENTS:
            ${events.substring(0, 4000)}

            TASK: Map downstream beneficiaries across different sectors.
            Focus on "Non-Obvious" 2nd and 3rd order effects.
            
            EXAMPLES:
            - Event: "Oil Spike" -> 1st: XOM (Oil) -> 2nd: UNP (Rail efficiency vs Trucking) -> 3rd: TAN (Solar demand).
            - Event: "AI Boom" -> 1st: NVDA -> 2nd: VRT (Data Center Cooling) -> 3rd: ETR (Utilities/Power).

            OUTPUT JSON:
            {
                "maps": [
                    {
                        "root_event": "Summary of the trigger event",
                        "nodes": [
                            { "ticker": "SYM", "sector": "Sector Name", "order": 2, "logic": "Explanation of the link", "confidence": 85 },
                            { "ticker": "SYM", "sector": "Sector Name", "order": 3, "logic": "Explanation of the link", "confidence": 75 }
                        ]
                    }
                ]
            }
        `;

        const msg = await anthropic.messages.create({
            model: 'claude-3-haiku-20240307',
            max_tokens: 1500,
            messages: [{ role: 'user', content: prompt }]
        });

        const text = msg.content[0].type === 'text' ? msg.content[0].text : '{}';
        const data = extractJSON(text);

        if (data.maps) {
            for (const map of data.maps) {
                for (const node of map.nodes) {
                    // Basic ticker validation
                    if (node.ticker && /^[A-Z]{1,5}$/.test(node.ticker)) {
                        // Verify ticker exists via FMP (light check)
                        try {
                            const profile = await fmpService.getCompanyProfile(node.ticker);
                            if (profile) {
                                opportunities.push({
                                    ticker: node.ticker,
                                    sector: node.sector,
                                    order: node.order,
                                    logic: `[${node.order === 2 ? '2nd' : '3rd'} Order] Derived from "${map.root_event}": ${node.logic}`,
                                    confidence: node.confidence
                                });
                                
                                // Log to DB
                                await pool.query(`
                                    INSERT INTO beneficiary_graphs (root_event, order_level, sector_path, beneficiary_ticker, correlation_logic, confidence_score)
                                    VALUES ($1, $2, $3, $4, $5, $6)
                                `, [map.root_event, node.order, node.sector, node.ticker, node.logic, node.confidence]);

                                console.log(`      -> 🔗 MAPPED: ${node.ticker} (${node.order}nd Order) - ${node.logic.substring(0, 50)}...`);
                            }
                        } catch(e) {}
                    }
                }
            }
        }

        return opportunities;

    } catch (e) {
        console.error("Beneficiary Router Error:", e);
        return [];
    }
  }
}

export default new BeneficiaryRouterService();
