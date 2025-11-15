// backend/scripts/testPriceAPIs.js
// Test script to verify all price API sources
require('dotenv').config();
const axios = require('axios');

const testSymbol = 'AAPL';

console.log('🧪 TESTING ALL PRICE API SOURCES');
console.log('================================\n');

async function testAlphaVantage() {
  const key = process.env.ALPHA_VANTAGE_API_KEY;
  
  if (!key) {
    console.log('1️⃣  ALPHA VANTAGE');
    console.log('❌ Status: API key not configured\n');
    return false;
  }

  try {
    const response = await axios.get(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${testSymbol}&apikey=${key}`,
      { timeout: 10000 }
    );

    if (response.data['Global Quote']?.['05. price']) {
      const price = parseFloat(response.data['Global Quote']['05. price']);
      console.log('1️⃣  ALPHA VANTAGE');
      console.log('✅ Status: WORKING');
      console.log(`✅ ${testSymbol} Price: $${price.toFixed(2)}\n`);
      return true;
    } else if (response.data['Note']) {
      console.log('1️⃣  ALPHA VANTAGE');
      console.log('⚠️  Status: RATE LIMITED\n');
      return false;
    } else {
      console.log('1️⃣  ALPHA VANTAGE');
      console.log('❌ Status: FAILED\n');
      return false;
    }
  } catch (error) {
    console.log('1️⃣  ALPHA VANTAGE');
    console.log(`❌ Status: FAILED - ${error.message}\n`);
    return false;
  }
}

async function testFinnhub() {
  const key = process.env.FINNHUB_API_KEY;
  
  if (!key) {
    console.log('2️⃣  FINNHUB');
    console.log('❌ Status: API key not configured');
    console.log('💡 Get free key: https://finnhub.io/register\n');
    return false;
  }

  try {
    const response = await axios.get(
      `https://finnhub.io/api/v1/quote?symbol=${testSymbol}&token=${key}`,
      { timeout: 10000 }
    );

    if (response.data && response.data.c && response.data.c > 0) {
      const price = response.data.c;
      console.log('2️⃣  FINNHUB');
      console.log('✅ Status: WORKING');
      console.log(`✅ ${testSymbol} Price: $${price.toFixed(2)}\n`);
      return true;
    } else {
      console.log('2️⃣  FINNHUB');
      console.log('❌ Status: FAILED\n');
      return false;
    }
  } catch (error) {
    console.log('2️⃣  FINNHUB');
    console.log(`❌ Status: FAILED - ${error.message}\n`);
    return false;
  }
}

async function testYahoo() {
  try {
    const response = await axios.get(
      `https://query1.finance.yahoo.com/v8/finance/chart/${testSymbol}`,
      {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      }
    );

    const price = response.data?.chart?.result?.[0]?.meta?.regularMarketPrice;
    
    if (price) {
      console.log('3️⃣  YAHOO FINANCE');
      console.log('✅ Status: WORKING');
      console.log(`✅ ${testSymbol} Price: $${price.toFixed(2)}\n`);
      return true;
    } else {
      console.log('3️⃣  YAHOO FINANCE');
      console.log('❌ Status: FAILED\n');
      return false;
    }
  } catch (error) {
    console.log('3️⃣  YAHOO FINANCE');
    console.log(`❌ Status: FAILED - ${error.message}\n`);
    return false;
  }
}

async function runTests() {
  const results = {
    alphaVantage: await testAlphaVantage(),
    finnhub: await testFinnhub(),
    yahoo: await testYahoo()
  };

  const workingCount = Object.values(results).filter(r => r).length;

  console.log('📊 SUMMARY');
  console.log('=========');
  console.log(`Working APIs: ${workingCount}/3\n`);

  if (workingCount >= 2) {
    console.log('✅ SYSTEM STATUS: HEALTHY');
    console.log('💡 Signal generation should work!\n');
  } else if (workingCount === 1) {
    console.log('⚠️  SYSTEM STATUS: DEGRADED\n');
  } else {
    console.log('❌ SYSTEM STATUS: CRITICAL');
    console.log('💡 Add FINNHUB_API_KEY to Railway\n');
  }

  process.exit(workingCount >= 1 ? 0 : 1);
}

runTests().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
