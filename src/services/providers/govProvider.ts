import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseStringPromise } from 'xml2js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Robust Headers to bypass 403s
const HEADERS = {
  'User-Agent': 'MarketAIBot/1.0 (Research; contact@marketai.com)',
  'Accept': 'application/json, application/xml, text/xml, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://house-stock-watcher.com'
};

class GovProvider {
  private houseCachePath = path.join(__dirname, '../../data/cache/gov_house_trades.json');

  async getWhiteHouseFeed() {
    try {
      // Updated Endpoint: Specific Briefing Room Feed
      const url = 'https://www.whitehouse.gov/briefing-room/feed/';
      const res = await axios.get(url, { headers: HEADERS, timeout: 8000 });
      const result = await parseStringPromise(res.data);
      
      if (result.rss?.channel?.[0]?.item) {
        return result.rss.channel[0].item.map((i: any) => ({
          title: i.title?.[0],
          link: i.link?.[0],
          date: i.pubDate?.[0],
          source: 'WhiteHouse'
        }));
      }
    } catch (e) {
      // Silent fail (Caller handles empty array)
    }
    return [];
  }

  async getHouseTradingData() {
    // Primary: House Stock Watcher S3 Bucket
    try {
      const url = 'https://house-stock-watcher-data.s3-us-west-2.amazonaws.com/data/all_transactions.json';
      const res = await axios.get(url, { headers: HEADERS, timeout: 10000 });
      if (Array.isArray(res.data) && res.data.length > 0) {
          return res.data.slice(0, 50); // Top 50 most recent
      }
    } catch (e) {
      // Fallback: Local Cache
      return this.getLocalHouseTrades();
    }
    return this.getLocalHouseTrades();
  }

  async getSenateTradingData() {
    try {
      const url = 'https://senate-stock-watcher-data.s3-us-west-2.amazonaws.com/aggregate/all_transactions.json';
      const res = await axios.get(url, { headers: HEADERS, timeout: 10000 });
      if (Array.isArray(res.data)) return res.data.slice(0, 50);
    } catch (e) {}
    return []; 
  }

  private getLocalHouseTrades() {
    try {
      if (fs.existsSync(this.houseCachePath)) {
        const data = fs.readFileSync(this.houseCachePath, 'utf-8');
        const parsed = JSON.parse(data);
        // Mark as cached source
        return parsed.map((p: any) => ({ ...p, source: 'Local Cache' }));
      }
    } catch (e) {}
    return [];
  }
}

export default new GovProvider();
