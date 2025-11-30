import axios from 'axios';
import { parseStringPromise } from 'xml2js';
import { generateContentHash, extractTickers } from '../../utils/dataUtils.js';

export async function collectTariffNews() {
  const items = [];
  console.log('   Running Tariff/Trump Monitor...');
  
  // We use specific RSS searches for "Tariff", "Trade", "Trump"
  // Google News RSS is very reliable for this
  const feedUrl = 'https://news.google.com/rss/search?q=Trump+Tariffs+Trade+China&hl=en-US&gl=US&ceid=US:en';

  try {
    const res = await axios.get(feedUrl, { timeout: 5000 });
    const result = await parseStringPromise(res.data);
    const entries = result.rss?.channel?.[0]?.item || [];

    for (const entry of entries.slice(0, 5)) {
      const title = entry.title?.[0] || '';
      const link = entry.link?.[0] || '';
      const pubDate = entry.pubDate?.[0] || new Date().toISOString();
      
      items.push({
        category: 'political',
        source: 'Tariff Monitor',
        external_id: generateContentHash('TARIFF', title, pubDate),
        title: title,
        content: `Detected relevant trade policy news. Analyzing for market impact.`,
        url: link,
        published_at: new Date(pubDate),
        tickers: extractTickers(title), // Will pick up auto/steel/tech stocks mentioned
        raw_metadata: { keyword: 'tariff' },
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });
    }
  } catch (e) { console.error('   Tariff Monitor Failed'); }
  
  return items;
}
