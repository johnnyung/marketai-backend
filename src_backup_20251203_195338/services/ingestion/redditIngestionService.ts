import { IngestionResult } from './ingestionTypes.js';

class RedditIngestionService {
    async run(): Promise<IngestionResult> {
        // Placeholder for Reddit API
        return {
            success: true,
            source: 'Reddit (WSB)',
            recordsProcessed: 0,
            timestamp: new Date().toISOString(),
            dataSample: { note: 'Reddit API not configured' }
        };
    }
}
export default new RedditIngestionService();
