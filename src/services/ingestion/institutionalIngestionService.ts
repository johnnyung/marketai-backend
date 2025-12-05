import fmpService from '../fmpService.js';
import { IngestionResult } from './ingestionTypes.js';

class InstitutionalIngestionService {
    async run(ticker: string = 'AAPL'): Promise<IngestionResult> {
        try {
            const holders = await fmpService.getInstitutionalHolders(ticker);
            return {
                success: true,
                source: `Institutional (${ticker})`,
                recordsProcessed: holders.length,
                timestamp: new Date().toISOString(),
                dataSample: holders[0]
            };
        } catch (e: any) {
            return { success: false, source: 'Institutional', recordsProcessed: 0, timestamp: new Date().toISOString(), error: e.message };
        }
    }
}
export default new InstitutionalIngestionService();
