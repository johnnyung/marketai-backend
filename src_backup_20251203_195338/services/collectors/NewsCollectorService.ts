import { Pool } from 'pg';
import newsApiService from '../newsApiService.js';

class NewsCollectorService {
    private pool: Pool;

    constructor(pool: Pool) {
        this.pool = pool;
    }

    async collect(query: string = 'general') {
        const news = await newsApiService.getBreakingNews(20);
        
        for (const article of news) {
            try {
                // Adapt new interface to DB schema
                // description -> summary
                // publishedAt -> publishedDate
                // urlToImage -> null (not in new interface)
                await this.pool.query(
                    `INSERT INTO news_articles 
                    (url, source, title, description, content, author, url_to_image, published_at, raw_json)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    ON CONFLICT (url) DO NOTHING`,
                    [
                        article.url,
                        article.source || 'Unknown',
                        article.title,
                        article.summary || '',
                        article.summary || '', // Content fallback
                        'Unknown', // Author
                        null, // Image
                        new Date(article.publishedDate),
                        JSON.stringify(article)
                    ]
                );
            } catch (e) {
                console.error('Error saving news:', e.message);
            }
        }
    }
}

export default NewsCollectorService;
