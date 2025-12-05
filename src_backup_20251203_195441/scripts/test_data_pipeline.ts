import marketDataService from '../services/marketDataService.js';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
    console.log("🔍 Testing Data Pipeline Layers...");
    console.log("   (FMP Key Present: " + (!!process.env.FMP_API_KEY) + ")");
    console.log("   (Tiingo Key Present: " + (!!process.env.TIINGO_API_KEY) + ")");
    
    // 1. Test Standard Stock
    console.log("\n1. Testing Stock (AAPL)...");
    await marketDataService.getStockPrice('AAPL');

    // 2. Test Standard Crypto (Clean)
    console.log("\n2. Testing Crypto (BTC)...");
    await marketDataService.getStockPrice('BTC');

    // 3. Test Crypto with Hyphen (Yahoo Style)
    console.log("\n3. Testing Yahoo Style (BTC-USD)...");
    await marketDataService.getStockPrice('BTC-USD');

    // 4. Test Altcoin
    console.log("\n4. Testing Altcoin (SOL)...");
    await marketDataService.getStockPrice('SOL');
}

test();
