import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// --- UNIVERSAL ENV LOADING START ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '../../');

// Load both .env and .env.local explicitly
dotenv.config({ path: path.join(root, '.env') });
dotenv.config({ path: path.join(root, '.env.local') });
// --- UNIVERSAL ENV LOADING END ---

import fmpService from '../services/fmpService.js';

async function main() {
  try {
    console.log('\n🔍 Running FMP Core Verification (Phase E)...');
    console.log('   Context Root:', root);
    
    if (!process.env.FMP_API_KEY) {
        console.error('❌ NO API KEY FOUND IN ENV');
        console.log('   Checked .env and .env.local in root.');
        process.exit(1);
    }
    console.log('   Key Present:', process.env.FMP_API_KEY.substring(0,4) + '...');

    console.log('\n   Fetching Price (quote?symbol=AAPL)...');
    const price = await fmpService.getPrice('AAPL');
    
    console.log('   Fetching Profile (profile?symbol=AAPL)...');
    const profile = await fmpService.getCompanyProfile('AAPL');
    
    console.log('   Fetching SP500 (sp500-constituents)...');
    const sp500 = await fmpService.getSP500Constituents();

    console.log('\n--- RESULTS ---');
    console.log('Price:', price ? `✅ ${price.price}` : '❌ NULL');
    console.log('Profile:', profile ? `✅ ${profile.companyName}` : '❌ NULL');
    console.log('SP500:', Array.isArray(sp500) && sp500.length > 0 ? `✅ Array[${sp500.length}]` : '❌ EMPTY/NULL');

    const ok = price && profile; // Strict check on core data

    if (!ok) {
      console.error('❌ Critical FMP Core Failure.');
      process.exit(1);
    }

    console.log('✅ FMP Core Verified.');
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Verification Error:', err?.message || err);
    process.exit(1);
  }
}

main();
