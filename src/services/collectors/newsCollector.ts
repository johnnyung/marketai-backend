import axios from 'axios';
import { parseStringPromise } from 'xml2js';
import { generateContentHash, extractTickers } from '../../utils/dataUtils.js';
import liveStatusService from '../liveStatusService.js';
import adaptiveLearningService from '../adaptiveLearningService.js'; // NEW

const BASE_SOURCES = [
  { id: 'reuters', name: 'Reuters', url: 'https://news.google.com/rss/search?q=site:reuters.com+finance&hl=en-US&gl=US&ceid=US:en' },
  { id: 'cnbc', name: 'CNBC', url: 'https://news.google.com/rss/search?q=site:cnbc.com+markets&hl=en-US&gl=US&ceid=US:en' }
];

export async function collectFinancialNews() {
  const allItems: any[] = [];
  const sources = [...BASE_SOURCES];

  // 1. DYNAMIC EXPANSION: Check what the AI wants to learn about
  const priorities = await adaptiveLearningService.getPriorities('news');
  if (priorities.length > 0) {
      console.log(`   🧬 News Collector adapting to hunt for: ${priorities.join(', ')}`);
      for (const topic of priorities) {
          sources.push({
              id: `adaptive_${topic.replace(/\s+/g, '_')}`,
              name: `AI Hunt: ${topic}`,
              url: `https://news.google.com/rss/search?q=${encodeURIComponent(topic + ' stock market')}&hl=en-US&gl=US&ceid=US:en`
          });
      }
  }
  
  await Promise.all(sources.map(async (source) => {
    try {
      const res = await axios.get(source.url, { timeout: 8000 });
      const result = await parseStringPromise(res.data);
      const entries = result.rss?.channel?.[0]?.item || [];
      const recent = entries.slice(0, 20);
      
      for (const entry of recent) {
        const title = entry.title?.[0] || '';
        if (title) {
          allItems.push({
            category: 'news',
            source: source.name,
            external_id: generateContentHash(source.name, title, new Date().toISOString().split('T')[0]),
            title: title,
            content: title, // Google RSS descriptions are often empty, title is best
            url: entry.link?.[0],
            published_at: new Date(entry.pubDate?.[0] || new Date()),
            tickers: extractTickers(title),
            raw_metadata: { feed_url: source.url },
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          });
        }
      }
      await liveStatusService.update('news', 'new_data', `Found ${recent.length}`, recent.length);
    } catch (e) {
      // Only log error if it's not an adaptive source (adaptive ones might have 0 results)
      if (!source.id.startsWith('adaptive')) {
         await liveStatusService.update('news', 'cached', 'No updates', 0);
      }
    }
  }));
  
  console.log(`   📰 News Collection: ${allItems.length} articles found.`);
  return allItems;
}
