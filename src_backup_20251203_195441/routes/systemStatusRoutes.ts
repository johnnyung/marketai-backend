import express from 'express';
import pool from '../db/index.js';

const router = express.Router();

router.get('/detailed', async (req, res) => {
  try {
    // THESE MUST MATCH FRONTEND WIDGET IDS EXACTLY
    const allSources = [
      { id: 'news', name: 'News', display: 'Global News' },
      { id: 'congress', name: 'Congress', display: 'Congress Trading' },
      { id: 'whale', name: 'Whale', display: 'Whale Alert' },
      { id: 'tariff', name: 'Tariff', display: 'Tariff Monitor' },
      { id: 'youtube', name: 'YouTube', display: 'YouTube Finance' },
      { id: 'sec', name: 'SEC', display: 'SEC Filings' },
      { id: 'political', name: 'Political', display: 'Gov Announcements' },
      { id: 'whitehouse', name: 'White House', display: 'White House' },
      { id: 'coingecko', name: 'CoinGecko', display: 'Crypto Prices' },
      { id: 'alpha', name: 'Alpha', display: 'Alpha Vantage' },
      { id: 'finnhub', name: 'Finnhub', display: 'Finnhub' },
      { id: 'fred', name: 'FRED', display: 'FRED Data' },
      { id: 'fmp', name: 'FMP', display: 'FMP Data' },
      { id: 'reddit', name: 'Reddit', display: 'Reddit Sentiment' },
      // Add System Agents
      { id: 'research_agent', name: 'Research Agent', display: 'Research Agent', category: 'system' },
      { id: 'ai_analyst', name: 'AI Analyst', display: 'AI Analyst', category: 'system' }
    ];

    const statusMap = [];

    for (const source of allSources) {
        if (source.category === 'system') {
            // Check system agents differently
            const table = source.id === 'research_agent' ? 'historical_events' : 'pattern_matches';
            const col = source.id === 'research_agent' ? 'collected_at' : 'detected_at';
            const res = await pool.query(`SELECT MAX(${col}) as last FROM ${table}`);
            const last = res.rows[0].last ? new Date(res.rows[0].last) : null;
            
            let status = 'inactive';
            let message = 'Waiting...';
            
            if (last) {
                const mins = (Date.now() - last.getTime()) / 60000;
                status = mins < 5 ? 'fresh' : 'cached';
                message = `Active ${Math.round(mins)}m ago`;
            }
            statusMap.push({ ...source, status, count: 1, message });
            continue;
        }

        // Standard Data Sources
        let totalCount = 0;
        let lastUpdate = null;

        try {
            const dbRes = await pool.query(`
                SELECT COUNT(*) as count, MAX(created_at) as last_update
                FROM raw_intelligence
                WHERE source ILIKE $1 OR source_name ILIKE $1
            `, [`%${source.name}%`]);
            
            if (dbRes.rows.length > 0) {
                totalCount += parseInt(dbRes.rows[0].count || '0');
                const d = dbRes.rows[0].last_update ? new Date(dbRes.rows[0].last_update) : null;
                if (d) lastUpdate = d;
            }
        } catch (e) {}

        try {
             const rawRes = await pool.query(`
                SELECT COUNT(*) as count, MAX(collected_at) as last_update
                FROM raw_data_collection
                WHERE source_name ILIKE $1
             `, [`%${source.name}%`]);
             
             if (rawRes.rows.length > 0) {
                totalCount += parseInt(rawRes.rows[0].count || '0');
                const d = rawRes.rows[0].last_update ? new Date(rawRes.rows[0].last_update) : null;
                if (d && (!lastUpdate || d > lastUpdate)) lastUpdate = d;
             }
        } catch (e) {}

        let status = 'inactive';
        let message = 'No data';

        if (totalCount > 0 && lastUpdate) {
            const minsAgo = (Date.now() - lastUpdate.getTime()) / 60000;
            if (minsAgo < 30) {
                status = 'fresh';
                message = `Live: ${Math.round(minsAgo)}m ago`;
            } else {
                status = 'cached';
                message = `Cached: ${Math.round(minsAgo / 60)}h ago`;
            }
        }

        statusMap.push({
            id: source.id,
            name: source.display,
            status,
            count: totalCount,
            message
        });
    }

    res.json({ success: true, data: statusMap });
  } catch (error: any) {
    res.json({ success: false, data: [], error: error.message });
  }
});

export default router;
