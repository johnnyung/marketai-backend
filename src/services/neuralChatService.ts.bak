import { pool } from '../db/index.js';
import Anthropic from '@anthropic-ai/sdk';
import fmpService from './fmpService.js';
import marketDataService from './marketDataService.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY
});

interface ChatResponse {
  answer: string;
  sources: string[];
  related_tickers: string[];
}

class NeuralChatService {

  async generateResponse(query: string): Promise<ChatResponse> {
    console.log(`      💬 Neural Chat: Analyzing "${query}"...`);

    try {
        // 1. DETECT INTENT & CONTEXT
        // Extract tickers mentioned in query
        const tickerMatch = query.match(/\b[A-Z]{2,5}\b/g) || [];
        const tickers = [...new Set(tickerMatch)];
        
        let context = "";

        // 2. GATHER DEEP BRAIN CONTEXT
        if (tickers.length > 0) {
            // Fetch specific intelligence for these tickers
            for (const ticker of tickers) {
                // A. Latest Signals & Decision Matrix
                const signalRes = await pool.query(`
                    SELECT action, confidence, reasoning, decision_matrix, created_at
                    FROM ai_stock_tips
                    WHERE ticker = $1
                    ORDER BY created_at DESC LIMIT 1
                `, [ticker]);

                if (signalRes.rows.length > 0) {
                    const sig = signalRes.rows[0];
                    context += `\n[LATEST SIGNAL for ${ticker}]: ${sig.action} (Confidence: ${sig.confidence}%). \nREASONING: ${sig.reasoning}\nDECISION MATRIX: ${JSON.stringify(sig.decision_matrix)}\n`;
                }

                // B. Active Position Status
                const posRes = await pool.query(`
                    SELECT shares, avg_entry_price, unrealized_pnl
                    FROM stock_positions
                    WHERE ticker = $1
                `, [ticker]);

                if (posRes.rows.length > 0) {
                    const pos = posRes.rows[0];
                    context += `\n[PORTFOLIO STATUS]: Holding ${pos.shares} shares @ $${parseFloat(pos.avg_entry_price).toFixed(2)}. P&L: $${parseFloat(pos.unrealized_pnl).toFixed(2)}.\n`;
                }

                // C. Live Price
                const quote = await marketDataService.getStockPrice(ticker);
                if (quote) context += `\n[LIVE PRICE]: $${quote.price} (${quote.changePercent}%)\n`;
            }
        }

        // 3. GATHER MACRO/SYSTEM CONTEXT
        // If query is general, fetch macro state
        if (tickers.length === 0 || query.toLowerCase().includes("market") || query.toLowerCase().includes("outlook")) {
            const macroRes = await pool.query(`SELECT * FROM global_market_snapshots ORDER BY created_at DESC LIMIT 1`);
            if (macroRes.rows.length > 0) {
                context += `\n[MACRO REGIME]: ${macroRes.rows[0].regime} (Divergence: ${macroRes.rows[0].divergence_score})\n`;
            }
            
            // Fetch recent major news
            const newsRes = await pool.query(`
                SELECT source_name, ai_summary FROM digest_entries
                WHERE ai_relevance_score > 80
                ORDER BY created_at DESC LIMIT 3
            `);
            context += `\n[TOP HEADLINES]:\n${newsRes.rows.map(r => `- ${r.ai_summary}`).join('\n')}\n`;
        }

        // 4. GENERATE ANSWER
        const prompt = `
            ACT AS: The MarketAI Deep Brain.
            You are a sophisticated hedge fund AI.
            
            USER QUERY: "${query}"
            
            INTERNAL KNOWLEDGE BASE (REAL-TIME):
            ${context || "No specific data found for this query."}

            TASK: Answer the user concisely.
            - If discussing a specific stock, reference the specific "Decision Matrix" factors (e.g., "I recommended BUY because Insider Activity was High...").
            - If they ask about a position, tell them the P&L.
            - Be professional but direct.

            OUTPUT JSON:
            {
                "answer": "Your response string (can use markdown)",
                "sources": ["List of engines used, e.g. 'Insider Anomaly', 'Macro Liquidity'"],
                "related_tickers": ["TIC", "KER"]
            }
        `;

        const msg = await anthropic.messages.create({
            model: 'claude-3-haiku-20240307',
            max_tokens: 1000,
            messages: [{ role: 'user', content: prompt }]
        });

        const text = msg.content[0].type === 'text' ? msg.content[0].text : '{}';
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        const jsonStr = text.substring(start, end + 1);
        
        return JSON.parse(jsonStr);

    } catch (e: any) {
        console.error("Neural Chat Error:", e);
        return {
            answer: "I'm having trouble accessing my neural pathways right now. Please try again.",
            sources: ["System Error"],
            related_tickers: []
        };
    }
  }
}

export default new NeuralChatService();
