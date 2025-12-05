import axios from 'axios';

async function verify() {
  console.log('🔍 GOVERNMENT DATA VERIFICATION');
  console.log('-----------------------------------');
  let failures = 0;

  const check = async (name: string, url: string) => {
    process.stdout.write(`   Testing ${name.padEnd(20)} ... `);
    try {
      const res = await axios.get(url, { 
        timeout: 10000,
        headers: { 'User-Agent': 'MarketAI Research/1.0' }
      });
      if (res.status === 200) console.log('✅ PASS');
      else throw new Error(`Status ${res.status}`);
    } catch (e: any) {
      console.log(`❌ FAIL (${e.message})`);
      failures++;
    }
  };

  // 1. SEC EDGAR (Atom Feed)
  await check('SEC EDGAR', 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=4&count=10&output=atom');

  // 2. White House Feed
  await check('White House', 'https://www.whitehouse.gov/feed/');

  // 3. House Stock Watcher (Transactions)
  await check('House Trades', 'https://house-stock-watcher-data.s3-us-west-2.amazonaws.com/data/all_transactions.json');

  // 4. Federal Register API
  await check('Fed Register', 'https://www.federalregister.gov/api/v1/articles.json?per_page=1&order=newest');

  console.log('-----------------------------------');
  if (failures > 0) {
    console.error('🚨 Government Data Verification Failed.');
    process.exit(1);
  } else {
    console.log('✅ Government Sources Verified.');
    process.exit(0);
  }
}

verify();
