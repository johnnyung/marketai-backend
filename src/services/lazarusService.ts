import axios from 'axios';
import { parseStringPromise } from 'xml2js';

// ANTI-BOT USER AGENTS
const AGENTS = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1'
];

interface FetchResult {
  data: any;
  source_used: string;
  success: boolean;
}

class LazarusService {

  /**
   * Attempts to fetch an RSS/XML feed using multiple strategies
   * 1. Direct Google News Proxy
   * 2. Bing News Proxy (Fallback)
   * 3. Direct URL (Last Resort)
   */
  async fetchOrResurrect(query: string, directUrl?: string): Promise<FetchResult> {
    const agent = AGENTS[Math.floor(Math.random() * AGENTS.length)];
    const encodedQuery = encodeURIComponent(query);

    // STRATEGY A: GOOGLE NEWS PROXY (Primary)
    try {
        const gUrl = `https://news.google.com/rss/search?q=${encodedQuery}&hl=en-US&gl=US&ceid=US:en`;
        // console.log(`      Trying Lazarus Strategy A (Google): ${query}`);
        const res = await axios.get(gUrl, { headers: { 'User-Agent': agent }, timeout: 5000 });
        const xml = await parseStringPromise(res.data);
        if (xml.rss?.channel?.[0]?.item?.length > 0) {
            return { data: xml.rss.channel[0].item, source_used: 'Google Proxy', success: true };
        }
    } catch(e) {}

    // STRATEGY B: BING NEWS PROXY (Fallback)
    // Note: Bing RSS format is slightly different, we simulate a structure match
    try {
        const bUrl = `https://www.bing.com/news/search?q=${encodedQuery}&format=rss`;
        console.log(`      ⚠️ Strategy A Failed. Engaging Lazarus Strategy B (Bing): ${query}`);
        const res = await axios.get(bUrl, { headers: { 'User-Agent': agent }, timeout: 6000 });
        const xml = await parseStringPromise(res.data);
        if (xml.rss?.channel?.[0]?.item?.length > 0) {
            return { data: xml.rss.channel[0].item, source_used: 'Bing Proxy', success: true };
        }
    } catch(e) {}

    // STRATEGY C: DIRECT URL (Last Resort)
    if (directUrl) {
        try {
            console.log(`      ⚠️ Strategy B Failed. Engaging Lazarus Strategy C (Direct): ${directUrl}`);
            const res = await axios.get(directUrl, { headers: { 'User-Agent': agent }, timeout: 8000 });
            // Handle both XML and JSON
            if (typeof res.data === 'object') {
                 return { data: res.data, source_used: 'Direct API', success: true };
            }
            const xml = await parseStringPromise(res.data);
            if (xml.rss?.channel?.[0]?.item?.length > 0) {
                return { data: xml.rss.channel[0].item, source_used: 'Direct RSS', success: true };
            }
        } catch(e) {}
    }

    return { data: [], source_used: 'None', success: false };
  }
}

export default new LazarusService();
