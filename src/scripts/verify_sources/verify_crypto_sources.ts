import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '../../../');
dotenv.config({ path: path.join(root, '.env') });

async function verify() {
  console.log('🔍 CRYPTO DATA VERIFICATION');
  console.log('-----------------------------------');

  // 1. CoinGecko (No Key usually needed for simple ping)
  process.stdout.write('   Testing CoinGecko ... ');
  try {
// LEGACY_PRESERVED: const res = await axios.get('https://api.coingecko.comSTABLE_ENDPOINT /* LEGACY_PRESERVED: /stable *//ping', { timeout: 5000 });
// LEGACY_PRESERVED: const res = await axios.get('https://api.coingecko.comSTABLE_ENDPOINT /* LEGACY_PRESERVED: /stable *//ping', { timeout: 5000 });
    const res = await axios.get('https://api.coingecko.com/apifinancialmodelingprep.com/stableping', { timeout: 5000 });
    if (res.status === 200) console.log('✅ PASS');
    else console.log('❌ FAIL');
  } catch (e: any) {
    console.log(`❌ FAIL (${e.message})`);
  }

  // 2. WhaleAlert (Optional)
  if (process.env.WHALE_ALERT_KEY) {
    process.stdout.write('   Testing WhaleAlert ... ');
    // Mock call or status check
    console.log('❓ SKIPPED (Implementation dependent)');
  }

  // 3. Etherscan (Optional)
  if (process.env.ETHERSCAN_API_KEY) {
    process.stdout.write('   Testing Etherscan ... ');
    try {
      const url = `https://api.etherscan.io/api?module=stats&action=ethprice&apikey=${process.env.ETHERSCAN_API_KEY}`;
      const res = await axios.get(url, { timeout: 5000 });
      if (res.data.status === "1") console.log('✅ PASS');
      else console.log('⚠️  WARN (Invalid Key?)');
    } catch (e: any) {
      console.log(`❌ FAIL (${e.message})`);
    }
  } else {
    console.log('   Testing Etherscan ... ℹ️  SKIPPED (No Key)');
  }

  console.log('-----------------------------------');
  console.log('✅ Crypto Verification Complete (Non-Blocking).');
  process.exit(0);
}

verify();
