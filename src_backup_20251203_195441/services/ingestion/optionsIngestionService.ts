import fmpService from '../fmpService.js';
import { IngestionResult } from './ingestionTypes.js';

class OptionsIngestionService {
    async run(ticker: string = 'AAPL'): Promise<IngestionResult> {
        try {
            const chain = await fmpService.getOptionChain(ticker);
            return {
                success: true,
                source: 'Options',
                recordsProcessed: chain.length,
                timestamp: new Date().toISOString(),
                dataSample: chain[0] || null
            };
        } catch (e: any) {
            return { success: false, source: 'Options', recordsProcessed: 0, timestamp: new Date().toISOString(), error: e.message };
        }
    }
}
export default new OptionsIngestionService();
