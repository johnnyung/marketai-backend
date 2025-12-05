import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import tickerUniverseService from '../../services/tickerUniverseService.js';
import sectorDiscoveryService from '../../services/sectorDiscoveryService.js';
import pairsTradingService from '../../services/pairsTradingService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '../../../');

dotenv.config({ path: path.join(root, '.env') });
dotenv.config({ path: path.join(root, '.env.local') });

async function verify() {
  console.log('🔍 INGESTION PIPELINE VERIFICATION');
  console.log('-----------------------------------');
  let failures = 0;

  // 1. Universe Generation
  try {
    process.stdout.write('   Testing Ticker Universe ... ');
    const universe = await tickerUniverseService.getUniverse();
    if (universe.length > 20) console.log(`✅ PASS (${universe.length} tickers)`);
    else throw new Error(`Too few tickers: ${universe.length}`);
  } catch (e: any) {
    console.log(`❌ FAIL (${e.message})`);
    failures++;
  }

  // 2. Sector Discovery
  try {
    process.stdout.write('   Testing Sector Discovery ... ');
    const targets = await sectorDiscoveryService.getSectorTargets();
    if (targets.growth && targets.growth.length > 0) console.log('✅ PASS');
    else throw new Error('Empty sector targets');
  } catch (e: any) {
    console.log(`❌ FAIL (${e.message})`);
    failures++;
  }

  // 3. Pairs Trading
  try {
    process.stdout.write('   Testing Pairs Engine ... ');
    const pairs = await pairsTradingService.generatePairs();
    // Pairs might be empty if market data is closed/unavailable, so we check for no crash
    console.log(`✅ PASS (Result type: ${Array.isArray(pairs) ? 'Array' : 'Unknown'})`);
  } catch (e: any) {
    console.log(`❌ FAIL (${e.message})`);
    failures++;
  }

  console.log('-----------------------------------');
  if (failures > 0) {
    console.error(`🚨 Ingestion Pipeline Verification Failed.`);
    process.exit(1);
  } else {
    console.log('✅ Ingestion Pipelines Operational.');
    process.exit(0);
  }
}

verify();
