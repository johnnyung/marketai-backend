import express from 'express';
import { pool } from '../db/index.js';
import axios from 'axios';
import * as cheerio from 'cheerio';
import Anthropic from '@anthropic-ai/sdk';

const router = express.Router();
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY
});

// 1. SCRAPER HELPER
async function scrapeArticle(url: string) {
    try {
        // Fake a browser user agent to avoid immediate blocks
        const { data } = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' },
            timeout: 5000
        });
        const $ = cheerio.load(data);
        
        // Remove junk
        $('script').remove();
        $('style').remove();
        $('nav').remove();
        $('footer').remove();

        const title = $('title').text().trim();
        // content: get paragraphs, join them, limit to ~5000 chars to save tokens
        const content = $('p').map((i, el) => $(el).text()).get().join('\n').substring(0, 5000);
        
        return { title, content, success: true };
    } catch (e: any) {
        console.error("Scrape failed:", e.message);
        return { title: "Scrape Failed", content: "Could not access URL automatically. Relying on user notes.", success: false };
    }
}

// 2. CONTEXT RETRIEVER
async function getHistoricalContext(notes: string) {
    // Simple keyword extraction for context search
    const keywords = notes.split(' ').filter(w => w.length > 5).slice(0, 3).join(' | ');
    
    try {
        const res = await pool.query(`
            SELECT event, description, affected_sectors, recovery_pattern
            FROM historical_events
            WHERE description ILIKE '%' || $1 || '%'
               OR event ILIKE '%' || $1 || '%'
            LIMIT 3
        `, [keywords.split(' | ')[0]]); // Search first keyword for now
        return res.rows;
    } catch (e) { return []; }
}

// 3. ANALYZE ENDPOINT
router.post('/analyze', async (req, res) => {
    const { url, notes } = req.body;
    
    try {
        // A. Gather Data
        const article = await scrapeArticle(url);
        const history = await getHistoricalContext(notes);
        
        // B. AI Processing
        const prompt = `
            You are a Geopolitical & Market Risk Analyst.
            
            USER RESEARCH NOTES:
            "${notes}"
            
            SOURCE ARTICLE CONTENT (${article.title}):
            "${article.content}"
            
            INTERNAL DATABASE HISTORY (Potential Parallels):
            ${JSON.stringify(history)}
            
            TASK:
            1. VALIDATION: Compare the User's Notes against the Source Article. Is the user's premise factually supported by the text?
            2. CORRELATION: Use the "Internal Database History" to find precedents. If Trump met Saudi before, what SPECIFICALLY happened to Defense/Oil stocks 30-90 days later?
            3. PREDICTION: Based on this specific new event, forecast the next market moves.
            
            OUTPUT JSON ONLY:
            {
                "validation": "Valid/Invalid + 1 sentence explanation.",
                "summary": "Brief summary of the event.",
                "historical_parallels": [
                    { "event": "Name of past event", "outcome": "What happened to stocks" }
                ],
                "opportunities": [
                    {
                        "ticker": "SYM",
                        "sector": "Sector Name",
                        "direction": "BUY/SELL",
                        "reasoning": "Why this specific event triggers this move based on history.",
                        "confidence": 85
                    }
                ]
            }
        `;

        const msg = await anthropic.messages.create({
            model: 'claude-3-haiku-20240307',
            max_tokens: 2000,
            messages: [{ role: 'user', content: prompt }]
        });
        
        const text = msg.content[0].type === 'text' ? msg.content[0].text : '{}';
        const jsonStr = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
        const analysis = JSON.parse(jsonStr);

        // C. Save to DB (Memory)
        await pool.query(`
            INSERT INTO event_analyses
            (url, user_notes, article_title, article_summary, ai_validation, found_correlations, trading_opportunities)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
            url,
            notes,
            article.title,
            analysis.summary,
            analysis.validation,
            JSON.stringify(analysis.historical_parallels),
            JSON.stringify(analysis.opportunities)
        ]);

        res.json({ success: true, data: analysis });

    } catch (error: any) {
        console.error("Event Analyzer Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 4. HISTORY ENDPOINT
router.get('/recent', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM event_analyses ORDER BY created_at DESC LIMIT 10");
        res.json({ success: true, data: result.rows });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

export default router;
