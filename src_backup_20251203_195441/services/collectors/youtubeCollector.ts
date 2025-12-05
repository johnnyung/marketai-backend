import axios from 'axios';
import { parseStringPromise } from 'xml2js';
import { generateContentHash, extractTickers } from '../../utils/dataUtils.js';
import liveStatusService from '../liveStatusService.js';

// Direct YouTube RSS often blocks servers.
// We use Google News RSS filtered for video content from these providers as a robust fallback.
const CHANNELS = [
  { name: 'CNBC', query: 'site:cnbc.com when:24h' },
  { name: 'Bloomberg', query: 'site:bloomberg.com video when:24h' },
  { name: 'Yahoo Finance', query: 'site:finance.yahoo.com video when:24h' }
];

export async function collectYoutubeData() {
  const items = [];
  console.log('   Running YouTube/Video Collector...');
  
  liveStatusService.update('youtube', 'scanning', 'Fetching Videos...');

  for (const channel of CHANNELS) {
    try {
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(channel.query)}&hl=en-US&gl=US&ceid=US:en`;
      const res = await axios.get(url, {
          timeout: 8000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Compatible; MarketAI/2.0)'
          }
      });
      const result = await parseStringPromise(res.data);
      const entries = result.rss?.channel?.[0]?.item || [];

      for (const entry of entries.slice(0, 3)) {
        const title = entry.title?.[0];
        const link = entry.link?.[0];
        const pubDate = entry.pubDate?.[0];

        if (title && link) {
          items.push({
            category: 'media',
            source: `YouTube: ${channel.name}`,
            external_id: generateContentHash('YT', title, pubDate),
            title: title,
            content: `Video segment from ${channel.name}: ${title}`,
            url: link,
            published_at: new Date(pubDate),
            tickers: extractTickers(title),
            raw_metadata: { channel: channel.name, type: 'video_proxy' },
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          });
        }
      }
    } catch (e) {
        // Continue to next channel
    }
  }
  
  if (items.length > 0) {
      liveStatusService.update('youtube', 'new_data', `${items.length} videos found`, items.length);
  } else {
      liveStatusService.update('youtube', 'cached', 'No new videos', 0);
  }
  
  return items;
}
