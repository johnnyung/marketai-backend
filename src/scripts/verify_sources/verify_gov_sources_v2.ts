import govProvider from '../../services/providers/govProvider.js';
import newsProvider from '../../services/providers/newsProvider.js';
import axios from 'axios';

async function runVerify() {
  console.log('🛡️  FDV-2: EXTENDED SOURCE VERIFICATION');
  console.log('=======================================');

  let govStatus = 'PASS';
  let newsStatus = 'PASS';

  // 1. GOVERNMENT
  console.log('\n🏛️  GOVERNMENT DATA');
  
  process.stdout.write('   - White House RSS... ');
  const wh = await govProvider.getWhiteHouseFeed();
  if (wh.length > 0) console.log(`✅ PASS (${wh.length} items)`);
  else { console.log('⚠️  WARN (Empty)'); govStatus = 'WARN'; }

  process.stdout.write('   - House Trading...   ');
  const house = await govProvider.getHouseTradingData();
  if (house.length > 0) {
      // Check if it's real or local fallback
      const isLocal = house[0].source === 'Local Cache';
      if (isLocal) console.log(`⚠️  WARN (${house.length} items from Cache)`);
      else console.log(`✅ PASS (${house.length} live items)`);
  } else {
      console.log('❌ FAIL');
      govStatus = 'FAIL';
  }
  
  process.stdout.write('   - Federal Register.. ');
  try {
      const res = await axios.get('https://www.federalregister.gov/api/v1/articles.json?per_page=1&order=newest');
      if (res.status === 200) console.log('✅ PASS');
      else console.log('❌ FAIL');
  } catch(e) { console.log('❌ FAIL'); govStatus = 'FAIL'; }

  // 2. NEWS HARDENING
  console.log('\n📰  NEWS DATA (Resilient)');
  
  process.stdout.write('   - Yahoo Finance...   ');
  const yahoo = await newsProvider.getYahooNews();
  if (yahoo.length > 0) {
      const src = yahoo[0].source;
      if (src === 'Local Cache') console.log(`⚠️  WARN (Cache Active)`);
      else console.log(`✅ PASS (${src})`);
  } else {
      console.log('❌ FAIL');
      newsStatus = 'FAIL';
  }

  process.stdout.write('   - MarketWatch...     ');
  const mw = await newsProvider.getMarketWatchNews();
  if (mw.length > 0) console.log(`✅ PASS (${mw.length} items)`);
  else console.log('⚠️  WARN (Empty)');

  console.log('=======================================');
  
  // Logic: Fallbacks are acceptable warnings. Only total failure is FAIL.
  if (govStatus === 'FAIL' || newsStatus === 'FAIL') {
      console.error('🚨 VERIFICATION FAILED: Critical endpoints unreachable.');
      process.exit(1);
  } else {
      console.log('✅ FDV-2 VERIFIED: System is resilient.');
      process.exit(0);
  }
}

runVerify();
