import fmpService from '../fmpService.js';
import { IngestionResult } from './ingestionTypes.js';
import pool from '../../db/index.js';

class EconomicIngestionService {
    async run(): Promise<IngestionResult> {
        try {
            const [gdp, cpi, rates] = await Promise.all([
                fmpService.getEconomicData('GDP'),
                fmpService.getEconomicData('CPI'),
                fmpService.getTreasuryRates()
            ]);

            const items = [
                ...(gdp || []).map((i: any) => ({ name: 'GDP', val: i.value, date: i.date })),
                ...(cpi || []).map((i: any) => ({ name: 'CPI', val: i.value, date: i.date })),
                ...(rates || []).map((i: any) => ({ name: '10Y_TREASURY', val: i.month10 || i.value, date: i.date }))
            ];

            let savedCount = 0;
            const client = await pool.connect();

            try {
                for (const item of items) {
                    const query = `
                        INSERT INTO macro_indicators (name, value, date, source)
                        VALUES ($1, $2, $3, 'FMP')
                        ON CONFLICT (name, date) DO NOTHING
                    `;
                    const res = await client.query(query, [item.name, item.val, item.date]);
                    if ((res.rowCount || 0) > 0) savedCount++;
                }
            } finally {
                client.release();
            }

            return {
                success: true,
                source: 'Economic (FMP)',
                recordsProcessed: savedCount,
                timestamp: new Date().toISOString(),
                dataSample: { count: items.length }
            };
        } catch (e: any) {
            return { success: false, source: 'Economic', recordsProcessed: 0, timestamp: new Date().toISOString(), error: e.message };
        }
    }
}
export default new EconomicIngestionService();
