import liveStatusService from '../liveStatusService.js';
import { generateContentHash } from '../../utils/dataUtils.js';
import lazarusService from '../lazarusService.js';

export async function collectPoliticalData() {
  const items: any[] = [];

  const SOURCES = [
      { id: 'whitehouse', name: 'White House', query: 'White House Economy Press Release' },
      { id: 'fed', name: 'Federal Reserve', query: 'Federal Reserve Interest Rates' },
      { id: 'treasury', name: 'US Treasury', query: 'US Treasury Department News' },
      { id: 'sec', name: 'SEC Enforcement', query: 'SEC Enforcement Actions' } // Added SEC Backup
  ];

  for (const src of SOURCES) {
      await liveStatusService.update(src.id, 'scanning', `Scanning ${src.name}...`, 0);
      
      // Use Lazarus for Resilient Fetching
      const result = await lazarusService.fetchOrResurrect(src.query);

      if (result.success && result.data.length > 0) {
          let count = 0;
          for(const entry of result.data.slice(0, 5)) {
               const title = entry.title?.[0] || '';
               const link = entry.link?.[0] || '';
               const date = new Date(entry.pubDate?.[0] || Date.now());
               
               items.push({
                  category: 'political',
                  source: src.name,
                  external_id: generateContentHash(src.name, title, date.toISOString()),
                  title: title,
                  content: title,
                  url: link,
                  published_at: date,
                  tickers: [],
                  raw_metadata: { origin: result.source_used },
                  expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000)
              });
              count++;
          }
          await liveStatusService.update(src.id, 'new_data', `${count} items via ${result.source_used}`, count);
      } else {
          await liveStatusService.update(src.id, 'cached', 'No updates found (Lazarus Active)', 0);
      }
      
      await new Promise(r => setTimeout(r, 1000));
  }

  return items;
}
