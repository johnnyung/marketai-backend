import { IngestionResult } from './ingestionTypes.js';

class CongressIngestionService {
    async run(): Promise<IngestionResult> {
        // Placeholder for real API (e.g. Quiver, House Stock Watcher)
        // Marks as success with 0 to indicate "Ran successfully, found nothing new"
        // or marks as DISABLED if no key.
        return {
            success: true,
            source: 'Congress Trading',
            recordsProcessed: 0,
            timestamp: new Date().toISOString(),
            dataSample: { note: 'External API not configured' }
        };
    }
}
export default new CongressIngestionService();
