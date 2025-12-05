import historicalDataService from '../services/historicalDataService.js';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
    console.log("🔍 Testing Historical Data Engine...");
    
    // 1. Stock (Tiingo)
    console.log("\n1. Stock History (AAPL)...");
    const aapl = await historicalDataService.getPriceHistory('AAPL');
    if (aapl.length > 10) console.log(`   ✅ Success: ${aapl.length} records`);
    else console.log("   ❌ Failed");

    // 2. Crypto (CoinGecko)
    console.log("\n2. Crypto History (BTC)...");
    const btc = await historicalDataService.getPriceHistory('BTC');
    if (btc.length > 10) console.log(`   ✅ Success: ${btc.length} records`);
    else console.log("   ❌ Failed");

    // 3. Mapping Fix (TSMC -> TSM)
    console.log("\n3. Ticker Mapping (TSMC)...");
    const tsm = await historicalDataService.getPriceHistory('TSMC');
    if (tsm.length > 10) console.log(`   ✅ Success: ${tsm.length} records`);
    else console.log("   ❌ Failed");
}

test();
