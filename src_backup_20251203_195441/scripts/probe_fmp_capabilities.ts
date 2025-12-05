import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import fmpService from '../services/fmpService.js';

interface CapabilityResult {
    endpoint: string;
    status: 'AVAILABLE' | 'MISSING' | 'ERROR';
    details: string;
}

async function runProbe() {
    console.log('\n📡 STARTING FMP CAPABILITY SCAN');
    console.log('================================================');

    if (!process.env.FMP_API_KEY) {
        console.error('❌ CRITICAL: No FMP_API_KEY found.');
        process.exit(1);
    }

    const TEST_TICKER = 'AAPL';
    const report: CapabilityResult[] = [];

    // Helper to run test
    const check = async (name: string, fn: () => Promise<any>): Promise<void> => {
        process.stdout.write(`   Checking ${name.padEnd(25)} ... `);
        try {
            const data = await fn();
            let status: 'AVAILABLE' | 'MISSING' = 'MISSING';
            let details = 'Returned null/empty';

            if (Array.isArray(data)) {
                if (data.length > 0) {
                    status = 'AVAILABLE';
                    details = `Array[${data.length}] items`;
                }
            } else if (data) {
                // Object check
                if (Object.keys(data).length > 0) {
                    status = 'AVAILABLE';
                    details = 'Object data received';
                }
            }

            console.log(`${status === 'AVAILABLE' ? '✅' : '❌'} ${status} (${details})`);
            report.push({ endpoint: name, status, details });

        } catch (e: any) {
            console.log(`❌ ERROR (${e.message})`);
            report.push({ endpoint: name, status: 'ERROR', details: e.message });
        }
        // Small delay to prevent rate limit lockout during probe
        await new Promise(r => setTimeout(r, 250));
    };

    // --- 1. CORE MARKET DATA ---
    await check('getPrice', () => fmpService.getPrice(TEST_TICKER));
    await check('getBatchPrices', () => fmpService.getBatchPrices([TEST_TICKER, 'MSFT']));
    await check('getDailyCandles', () => fmpService.getDailyCandles(TEST_TICKER, 10));
    await check('getIntraday', () => fmpService.getIntraday(TEST_TICKER, '5min'));

    // --- 2. ANALYST & INSIGHTS ---
    await check('getPriceTargets', () => fmpService.getPriceTargets(TEST_TICKER));
    await check('getAnalystEstimates', () => fmpService.getAnalystEstimates(TEST_TICKER));

    // --- 3. INSTITUTIONAL ---
    await check('getInstitutionalHolders', () => fmpService.getInstitutionalHolders(TEST_TICKER));
    await check('getInsiderTrades', () => fmpService.getInsiderTrades(TEST_TICKER));
    await check('getEtfHoldings', () => fmpService.getEtfHoldings('SPY'));

    // --- 4. DERIVATIVES ---
    await check('getOptionChain', () => fmpService.getOptionChain(TEST_TICKER));

    // --- 5. MACROECONOMICS ---
    await check('getEconomicData (GDP)', () => fmpService.getEconomicData('GDP'));
    await check('getEconomicData (CPI)', () => fmpService.getEconomicData('CPI'));
    await check('getEconomicData (PPI)', () => fmpService.getEconomicData('PPI'));
    await check('getEconomicData (Unrate)', () => fmpService.getEconomicData('unemploymentRate'));
    await check('getTreasuryRates', () => fmpService.getTreasuryRates());

    // --- 6. NEWS ---
    await check('getMarketNews', () => fmpService.getMarketNews(5));
    await check('getCompanyNews', () => fmpService.getCompanyNews(TEST_TICKER));

    // --- 7. FUNDAMENTALS ---
    await check('getCompanyProfile', () => fmpService.getCompanyProfile(TEST_TICKER));
    await check('getKeyMetrics', () => fmpService.getKeyMetrics(TEST_TICKER));
    await check('getFinancialRatios', () => fmpService.getFinancialRatios(TEST_TICKER));
    
    // --- REPORT GENERATION ---
    console.log('================================================');
    
    const availableCount = report.filter(r => r.status === 'AVAILABLE').length;
    const totalCount = report.length;
    const score = Math.round((availableCount / totalCount) * 100);

    console.log(`📊 CAPABILITY SCORE: ${score}/100`);
    console.log(`💾 Saving report to logs/fmp_capabilities.json...`);

    fs.writeFileSync(
        path.join(process.cwd(), 'logs', 'fmp_capabilities.json'),
        JSON.stringify({
            timestamp: new Date().toISOString(),
            score,
            available_endpoints: availableCount,
            results: report
        }, null, 2)
    );

    console.log('✅ PROBE COMPLETE.');
}

runProbe();
