import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseStringPromise } from 'xml2js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
];

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
}

class NewsProvider {
  private cachePath = path.join(__dirname, '../../data/cache/news_yahoo.json');

  private getHeaders() {
    const agent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    return {
      'User-Agent': agent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Connection': 'keep-alive'
    };
  }

  private async fetchWithRetry(url: string, retries = 2, type: 'json' | 'xml' = 'xml'): Promise<any> {
    for (let i = 0; i <= retries; i++) {
      try {
        const res = await axios.get(url, {
            headers: this.getHeaders(),
            timeout: 5000
        });
        return res;
      } catch (e: any) {
        if (e.response?.status === 429) {
            await new Promise(r => setTimeout(r, 2000 * (i + 1)));
        }
        if (i === retries) throw e;
        await new Promise(r => setTimeout(r, 500 * (i + 1)));
      }
    }
  }

  async getYahooNews(): Promise<NewsItem[]> {
    const items: NewsItem[] = [];
    try {
      const url = 'https://feeds.finance.yahoo.com/rss/2.0/headline?s=SPY,QQQ,AAPL,NVDA';
      const res = await this.fetchWithRetry(url, 1, 'xml');
      const result = await parseStringPromise(res.data);
      
      if (result.rss?.channel?.[0]?.item) {
        result.rss.channel[0].item.forEach((i: any) => {
          items.push({
            title: i.title?.[0],
            link: i.link?.[0],
            pubDate: i.pubDate?.[0],
            source: 'Yahoo RSS'
          });
        });
        return items;
      }
    } catch (e) {
      // Fallback logic if needed
    }
    return items;
  }

  async getMarketWatchNews(): Promise<NewsItem[]> {
    try {
      const url = 'http://feeds.marketwatch.com/marketwatch/topstories/';
      const res = await this.fetchWithRetry(url, 1, 'xml');
      const result = await parseStringPromise(res.data);
      if (result.rss?.channel?.[0]?.item) {
        return result.rss.channel[0].item.map((i: any) => ({
          title: i.title?.[0],
          link: i.link?.[0],
          pubDate: i.pubDate?.[0],
          source: 'MarketWatch'
        }));
      }
    } catch (e) {}
    return [];
  }

  async getRedditNews(): Promise<NewsItem[]> {
      try {
          const url = 'https://www.reddit.com/r/stocks/hot.json?limit=5';
          const res = await this.fetchWithRetry(url, 1, 'json');
          if (res.data?.data?.children) {
              return res.data.data.children.map((child: any) => ({
                  title: child.data.title,
                  link: `https://reddit.com${child.data.permalink}`,
                  pubDate: new Date(child.data.created_utc * 1000).toISOString(),
                  source: 'Reddit'
              }));
          }
      } catch (e) {}
      return [];
  }

  /**
   * UNIFIED AGGREGATOR (Required by Omni-Vector)
   */
  async getUnifiedNews(): Promise<NewsItem[]> {
    const [yahoo, mw, reddit] = await Promise.all([
        this.getYahooNews(),
        this.getMarketWatchNews(),
        this.getRedditNews()
    ]);
    
    const combined = [...yahoo, ...mw, ...reddit];

    if (combined.length === 0) {
        return this.getLocalFallback();
    }
    return combined;
  }

  private getLocalFallback(): NewsItem[] {
    try {
      if (fs.existsSync(this.cachePath)) {
        const data = fs.readFileSync(this.cachePath, 'utf-8');
        return JSON.parse(data);
      }
    } catch (e) {}
    return [];
  }
}

export default new NewsProvider();
