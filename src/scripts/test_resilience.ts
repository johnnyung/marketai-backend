import marketDataService from '../services/marketDataService.js';
import historicalDataService from '../services/historicalDataService.js';

async function test() {
  console.log('🔑 Testing Resilient Engine (FMP Pro)...');
  
  try {
      // 1. STOCK TEST
      console.log('   1. Testing Live Price (AAPL)...');
      const live = await marketDataService.getStockPrice('AAPL');
      if (live) console.log(`      ✅ Success: $${live.price} (Source: ${live.source})`);
      else console.log('      ❌ Live Failed');

      // 2. CRYPTO TEST
      console.log('   2. Testing Live Crypto (BTC)...');
      const crypto = await marketDataService.getStockPrice('BTC');
      if (crypto) console.log(`      ✅ Success: $${crypto.price} (Source: ${crypto.source})`);
      else console.log('      ❌ Crypto Failed');

      // 3. HISTORY TEST
      console.log('   3. Testing History (BTC)...');
      const hist = await historicalDataService.getPriceHistory('BTC');
      if (hist.length > 0) console.log(`      ✅ Success: ${hist.length} records retrieved`);
      else console.log('      ❌ History Failed');
      
  } catch (e: any) {
      console.error('   ❌ Test Error:', e.message);
  }
}

test();
