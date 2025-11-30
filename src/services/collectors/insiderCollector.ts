import axios from 'axios';
import { generateContentHash } from '../../utils/dataUtils.js';
import { isValidTicker } from '../../utils/tickerUtils.js';
import liveStatusService from '../liveStatusService.js';

export async function collectInsiderTrades() {
  const items = [];
  await liveStatusService.update('sec', 'scanning', 'Scanning Filings...', 0);

  try {
    const response = await axios.get('https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=4&count=100&output=atom', {
       headers: { 'User-Agent': 'MarketAI Research contact@marketai.com' },
       timeout: 10000
    });
    
    const entries = response.data.match(/<entry>[\s\S]*?<\/entry>/g) || [];
    
    for (const entry of entries) {
      const titleMatch = entry.match(/<title>(.*?)<\/title>/);
      const title = titleMatch ? titleMatch[1] : '';
      const linkMatch = entry.match(/<link[^>]*href="(.*?)"/);
      
      // SEC Title Format: "4 - Apple Inc. (0000320193) (Issuer)"
      // We want to extract the company name, then find its ticker
      // Since the Atom feed doesn't have the ticker directly, we use a heuristic
      // OR we rely on the "Subject" if available
      
      // BETTER REGEX: Look for text inside parentheses that looks like a ticker OR just trust known big cap names
      // Actually, for now, let's filter OUT the obvious garbage using our new validator
      // and try to extract potential tickers from the Company Name part
      
      if (title) {
         // Extract potential symbols from (SYMBOL) or [SYMBOL] patterns
         const symbolMatch = title.match(/\(([A-Z]{1,5})\)/);
         let tickers = [];
         
         if (symbolMatch && isValidTicker(symbolMatch[1])) {
             tickers.push(symbolMatch[1]);
         } else {
             // Fallback: Check words in title against known major tickers (simplified)
             // In a real prod environment, we'd map CIK to Ticker via a lookup table
             // For now, we rely on the updated validator to strip "JAMES"
         }

         if (tickers.length > 0) {
            items.push({
              category: 'insider_trade',
              source: 'SEC EDGAR',
              external_id: generateContentHash('SEC', title, new Date().toISOString().substring(0, 13)),
              title: title,
              content: `Insider Filing: ${title}`,
              url: linkMatch ? `https://www.sec.gov${linkMatch[1]}` : '',
              published_at: new Date(),
              tickers: tickers,
              raw_metadata: { type: 'Form 4' },
              expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
            });
         }
      }
    }
    await liveStatusService.update('sec', 'new_data', `Found ${items.length}`, items.length);
  } catch (e) { 
      await liveStatusService.update('sec', 'error', 'Feed Error', 0);
  }

  return items;
}
