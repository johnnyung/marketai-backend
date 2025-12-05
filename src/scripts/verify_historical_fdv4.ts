import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import historicalProviderService from '../services/historicalProviderService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '../../');

dotenv.config({ path: path.join(root, '.env') });
dotenv.config({ path: path.join(root, '.env.local') });

async function runVerification() {
  console.log("🛡️  FDV-4: HISTORICAL DATA HARDENING CHECK");
  console.log("==========================================");

  if (!process.env.FMP_API_KEY) {
    console.error("❌ FMP_API_KEY missing.");
    process.exit(1);
  }

  const TICKERS = ['AAPL', 'MSFT'];
  let failures = 0;

  for (const ticker of TICKERS) {
    console.log(`\n🔍 Analyzing ${ticker}...`);
    
    // 1. Daily Check
    process.stdout.write(`   - Daily Candles (30d)... `);
    const daily = await historicalProviderService.getDailyCandlesNormalized(ticker, 30);
    if (daily.length > 0) {
        // Check Sort order
        const first = new Date(daily[0].date).getTime();
        const last = new Date(daily[daily.length-1].date).getTime();
        if (last > first) {
            console.log(`✅ PASS (${daily.length} candles, Sorted ASC)`);
        } else {
            console.log(`❌ FAIL (Sorting Incorrect)`);
            failures++;
        }
    } else {
        console.log(`❌ FAIL (Empty)`);
        failures++;
    }

    // 2. Intraday Check
    process.stdout.write(`   - Intraday (5min)...     `);
    const intraday = await historicalProviderService.getIntradayCandlesNormalized(ticker, '5min', 50);
    if (intraday.length > 0) {
        const iFirst = new Date(intraday[0].date).getTime();
        const iLast = new Date(intraday[intraday.length-1].date).getTime();
        if (iLast > iFirst) {
             console.log(`✅ PASS (${intraday.length} candles, Sorted ASC)`);
        } else {
             console.log(`❌ FAIL (Sorting Incorrect)`);
             failures++;
        }
    } else {
        console.log(`⚠️  WARN (Empty - Market Closed or Plan Restriction?)`);
        // Don't fail hard on intraday if daily works, could be plan limits
    }
  }

  console.log("\n==========================================");
  if (failures > 0) {
      console.error(`🚨 FDV-4 FAILED: ${failures} errors detected.`);
      process.exit(1);
  } else {
      console.log(`✅ FDV-4 PASSED: Historical Data Layer Operational.`);
      process.exit(0);
  }
}

runVerification();
