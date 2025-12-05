import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fmpService from '../../services/fmpService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Resolve root from src/scripts/verify_sources -> ../../../
const root = path.resolve(__dirname, '../../../');

dotenv.config({ path: path.join(root, '.env') });
dotenv.config({ path: path.join(root, '.env.local') });

async function verify() {
  console.log('🔍 FMP CORE VERIFICATION');
  console.log('-----------------------------------');
  
  let failures = 0;
  const check = async (name: string, fn: () => Promise<any>) => {
    try {
      process.stdout.write(`   Testing ${name.padEnd(25)} ... `);
      const res = await fn();
      if (res && (Array.isArray(res) ? res.length > 0 : Object.keys(res).length > 0)) {
        console.log('✅ PASS');
      } else {
        console.log('⚠️  WARN (Empty/Null)');
      }
    } catch (e: any) {
      console.log(`❌ FAIL (${e.message})`);
      failures++;
    }
  };

  if (!process.env.FMP_API_KEY) {
    console.error('❌ CRITICAL: FMP_API_KEY missing.');
    process.exit(1);
  }

  const T = 'AAPL';
  await check('Price (Quote)', () => fmpService.getPrice(T));
  await check('Profile', () => fmpService.getCompanyProfile(T));
  await check('Market News', () => fmpService.getMarketNews(5));
  await check('Insider Trades', () => fmpService.getInsiderTrades(T));
  await check('Institutional', () => fmpService.getInstitutionalHolders(T));
  await check('Option Chain', () => fmpService.getOptionChain(T));
  await check('Economic (GDP)', () => fmpService.getEconomicData('GDP'));

  console.log('-----------------------------------');
  if (failures > 0) {
    console.error(`🚨 FMP Verification Failed with ${failures} errors.`);
    process.exit(1);
  } else {
    console.log('✅ FMP Core Verified.');
    process.exit(0);
  }
}

verify();
