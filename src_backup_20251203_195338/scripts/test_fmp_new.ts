import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const FMP_KEY = process.env.FMP_API_KEY;

async function test() {
  console.log('🔑 Testing Updated FMP Endpoints...');
  
  // 1. Test Quote Short (Live)
  try {
      console.log('   Testing /quote-short/AAPL...');
      const res = await axios.get(`https://financialmodelingprep.com/stable/quote-short/AAPL?apikey=${FMP_KEY}`);
      if(res.data && res.data.length > 0) console.log('   ✅ Live Price Success:', res.data[0]);
      else console.log('   ❌ Live Price Empty');
  } catch(e: any) { console.log('   ❌ Live Price Failed:', e.message); }

  // 2. Test Historical Full (History)
  try {
      console.log('   Testing /historical-price-full/BTCUSD...');
      const res = await axios.get(`https://financialmodelingprep.com/stable/historical-price-full/BTCUSD?apikey=${FMP_KEY}&serietype=line`);
      if(res.data && res.data.historical) console.log(`   ✅ History Success: ${res.data.historical.length} days`);
      else console.log('   ❌ History Empty');
  } catch(e: any) { console.log('   ❌ History Failed:', e.message); }
}

test();
