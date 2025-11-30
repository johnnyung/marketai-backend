import axios from 'axios';

const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
];

export async function scrapeRealPrice(ticker: string): Promise<number | null> {
  try {
    // Use Query2 API (JSON)
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`;
    const agent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    
    const res = await axios.get(url, {
      headers: { 'User-Agent': agent },
      timeout: 5000
    });

    const result = res.data?.chart?.result?.[0];
    if (result && result.meta) {
        return result.meta.regularMarketPrice || result.meta.previousClose;
    }
    return null;
  } catch (error) {
    return null;
  }
}
