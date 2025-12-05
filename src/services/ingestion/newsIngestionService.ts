import fmpService from '../fmpService.js';
import { IngestionResult } from './ingestionTypes.js';
import pool from '../../db/index.js';

class NewsIngestionService {
    async run(): Promise<IngestionResult> {
        try {
            const news = await fmpService.getMarketNews(50);
            
            if (!news || news.length === 0) {
                return { success: true, source: 'News (FMP)', recordsProcessed: 0, timestamp: new Date().toISOString(), dataSample: null };
            }

            let savedCount = 0;
            const client = await pool.connect();
            
            try {
                for (const n of news) {
                    const query = `
                        INSERT INTO news_articles (url, title, summary, source, published_at, tickers, sentiment)
                        VALUES ($1, $2, $3, $4, $5, $6, $7)
                        ON CONFLICT (url) DO NOTHING
                    `;
                    const res = await client.query(query, [
                        n.url || `manual-${Date.now()}-${Math.random()}`,
                        n.title,
                        n.text || n.summary,
                        n.site || 'FMP',
                        n.publishedDate,
                        n.symbol ? [n.symbol] : [],
                        'NEUTRAL' // Placeholder until sentiment engine runs
                    ]);
                    if ((res.rowCount || 0) > 0) savedCount++;
                }
            } finally {
                client.release();
            }

            return {
                success: true,
                source: 'News (FMP)',
                recordsProcessed: savedCount, // Return actual DB inserts
                timestamp: new Date().toISOString(),
                dataSample: news[0]
            };
        } catch (e: any) {
            return { success: false, source: 'News', recordsProcessed: 0, timestamp: new Date().toISOString(), error: e.message };
        }
    }
}
export default new NewsIngestionService();
