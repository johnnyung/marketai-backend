import axios from 'axios';
import * as cheerio from 'cheerio';

export async function scrapeGooglePrice(ticker: string): Promise<number | null> {
  try {
    // Google Finance URL structure
    const url = `https://www.google.com/finance/quote/${ticker}:NYSE`;
    
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 4000
    });

    const $ = cheerio.load(res.data);
    const priceText = $('.YMlKec.fxKbKc').first().text(); // Current price class in Google Finance
    const price = parseFloat(priceText.replace(/[^0-9.]/g, ''));
    
    return (!isNaN(price) && price > 0) ? price : null;
  } catch (error) {
    return null;
  }
}
