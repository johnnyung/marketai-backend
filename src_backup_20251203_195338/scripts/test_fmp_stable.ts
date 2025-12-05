import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import fmpService from '../services/fmpService.js';

async function runTest() {
    console.log('\n📡 FMP STABLE API TEST HARNESS');
    console.log('=============================================');
    
    const SYMBOL = 'AAPL';
    
    // Helper
    const check = async (name: string, fn: () => Promise<any>) => {
        process.stdout.write(`   Checking ${name.padEnd(25)} ... `);
        try {
            const res = await fn();
            if (Array.isArray(res)) {
                if (res.length > 0) console.log(`✅ PASS (Array[${res.length}])`);
                else console.log(`⚠️  SKIP (Empty - Cap Unavailable?)`);
            } else if (res) {
                console.log(`✅ PASS (Object)`);
            } else {
                console.log(`⚠️  SKIP (Null/404)`);
            }
        } catch (e: any) {
            console.log(`❌ FAIL (${e.message})`);
        }
        await new Promise(r => setTimeout(r, 200));
    };

    // Run Tests
    await check('Quote', () => fmpService.getPrice(SYMBOL));
    await check('Profile', () => fmpService.getCompanyProfile(SYMBOL));
    await check('Ratios TTM', () => fmpService.getFinancialRatios(SYMBOL));
    await check('Daily Candles', () => fmpService.getDailyCandles(SYMBOL, 10));
    await check('Intraday 5m', () => fmpService.getIntraday(SYMBOL));
    await check('Analyst Targets', () => fmpService.getPriceTargets(SYMBOL));
    await check('Institutional', () => fmpService.getInstitutionalHolders(SYMBOL));
    await check('Insider Trades', () => fmpService.getInsiderTrades(SYMBOL));
    await check('Economic (GDP)', () => fmpService.getEconomicData('GDP'));
    await check('Market News', () => fmpService.getMarketNews(5));
    await check('SP500 List', () => fmpService.getSP500List());

    console.log('=============================================');
    console.log('📊 CAPABILITY SUMMARY:');
    console.log(JSON.stringify(fmpService.getCapabilities(), null, 2));
}

runTest();
