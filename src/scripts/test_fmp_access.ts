import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const FMP_KEY = process.env.FMP_API_KEY;

async function testConnection() {
  console.log('🔑 Testing FMP API Key...');
  
  if (!FMP_KEY) {
    console.error('❌ CRITICAL: FMP_API_KEY is missing from process.env');
    console.log('   -> Make sure it is set in your .env file or Railway Variables.');
    return;
  }
  
  console.log(`   Key found (starts with): ${FMP_KEY.substring(0, 4)}...`);

  // Test 1: Stock Price (AAPL)
  try {
    console.log('   Testing Stock Endpoint (AAPL)...');
    const stockRes = await axios.get(`https://financialmodelingprep.com/stable/quote/AAPL?apikey=${FMP_KEY}`);
    if (stockRes.data && stockRes.data.length > 0) {
       console.log(`   ✅ AAPL Price: $${stockRes.data[0].price}`);
    } else {
       console.log('   ❌ AAPL Response Empty:', stockRes.data);
    }
  } catch (e: any) {
    console.error(`   ❌ Stock Test Failed: ${e.response?.status} - ${e.response?.statusText}`);
  }

  // Test 2: Crypto Price (BTCUSD)
  try {
    console.log('   Testing Crypto Endpoint (BTCUSD)...');
    const cryptoRes = await axios.get(`https://financialmodelingprep.com/stable/quote/BTCUSD?apikey=${FMP_KEY}`);
    if (cryptoRes.data && cryptoRes.data.length > 0) {
       console.log(`   ✅ BTCUSD Price: $${cryptoRes.data[0].price}`);
    } else {
       console.log('   ❌ BTCUSD Response Empty:', cryptoRes.data);
    }
  } catch (e: any) {
    console.error(`   ❌ Crypto Test Failed: ${e.response?.status} - ${e.response?.statusText}`);
    if (e.response?.data) console.error('   Error Data:', JSON.stringify(e.response.data));
  }
}

testConnection();
