import fmpService from '../fmpService.js';
import { IngestionResult } from './ingestionTypes.js';
import { pool } from '../../db/index.js';

class InsiderIngestionService {
    async run(): Promise<IngestionResult> {
        try {
            const trades = await fmpService.getInsiderFeed();
            
            if (!trades || trades.length === 0) {
                 return { success: true, source: 'Insider (FMP)', recordsProcessed: 0, timestamp: new Date().toISOString() };
            }

            let savedCount = 0;
            const client = await pool.connect();

            try {
                for (const t of trades) {
                    const query = `
                        INSERT INTO insider_trades (
                            ticker, filing_date, transaction_date, reporting_name,
                            transaction_type, securities_transacted, price, link
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                        ON CONFLICT (link) DO NOTHING
                    `;
                    
                    // Generate a unique link if missing to prevent collision errors on non-unique data
                    const link = t.link || `manual-${t.symbol}-${t.filingDate}-${t.reportingName}`;

                    const res = await client.query(query, [
                        t.symbol,
                        t.filingDate,
                        t.transactionDate,
                        t.reportingName,
                        t.acquistionOrDisposition === 'A' ? 'BUY' : 'SELL',
                        t.securitiesTransacted,
                        t.price,
                        link
                    ]);
                    if ((res.rowCount || 0) > 0) savedCount++;
                }
            } finally {
                client.release();
            }

            return {
                success: true,
                source: 'Insider (FMP)',
                recordsProcessed: savedCount,
                timestamp: new Date().toISOString(),
                dataSample: trades[0]
            };
        } catch (e: any) {
            return { success: false, source: 'Insider', recordsProcessed: 0, timestamp: new Date().toISOString(), error: e.message };
        }
    }
}
export default new InsiderIngestionService();
