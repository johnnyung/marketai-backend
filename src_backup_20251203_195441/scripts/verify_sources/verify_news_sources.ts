import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '../../../');
dotenv.config({ path: path.join(root, '.env') });

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function verify() {
  console.log('🔍 NEWS SOURCE VERIFICATION');
  console.log('-----------------------------------');
  let failures = 0;

  const verifyUrl = async (name: string, url: string) => {
    process.stdout.write(`   Testing ${name.padEnd(20)} ... `);
    try {
      const res = await axios.get(url, { 
        timeout: 8000, 
        headers: { 'User-Agent': USER_AGENT } 
      });
      if (res.status === 200 && res.data.length > 100) {
        console.log('✅ PASS');
      } else {
        console.log(`⚠️  WARN (Status ${res.status})`);
      }
    } catch (e: any) {
      console.log(`❌ FAIL (${e.message})`);
      failures++;
    }
  };

  // 1. Yahoo Finance RSS
  await verifyUrl('Yahoo RSS', 'https://finance.yahoo.com/rss/headline?s=AAPL');

  // 2. MarketWatch (Often strict, check connectivity)
  await verifyUrl('MarketWatch', 'http://feeds.marketwatch.com/marketwatch/topstories/');

  // 3. Reddit Public JSON
  await verifyUrl('Reddit (Stocks)', 'https://www.reddit.com/r/stocks/hot.json?limit=1');

  // 4. YouTube Proxy (Google News RSS for Video)
  await verifyUrl('YouTube (Proxy)', 'https://news.google.com/rss/search?q=site:youtube.com+stock+market&hl=en-US&gl=US&ceid=US:en');

  console.log('-----------------------------------');
  // We allow some failures for external scraping as they can be flaky
  if (failures > 2) {
    console.error('🚨 News Verification Failed (Too many outages).');
    process.exit(1);
  } else {
    console.log('✅ News Sources Verified.');
    process.exit(0);
  }
}

verify();
