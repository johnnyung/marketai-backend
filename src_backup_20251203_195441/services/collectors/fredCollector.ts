import axios from 'axios';
import { generateContentHash } from '../../utils/dataUtils.js';
import liveStatusService from '../liveStatusService.js';

export async function collectFredData() {
  const items = [];
  
  if (!process.env.FRED_KEY) {
    liveStatusService.update('fred', 'error', 'No API Key');
    return [];
  }

  liveStatusService.update('fred', 'scanning', 'Fetching Indicators...');

  try {
    // Fetch CPI (Inflation) and GDP
    const seriesList = ['CPIAUCSL', 'GDP'];
    
    for (const series of seriesList) {
        const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${series}&api_key=${process.env.FRED_KEY}&file_type=json&limit=1&sort_order=desc`;
        const res = await axios.get(url, { timeout: 8000 });
        
        if (res.data.observations && res.data.observations.length > 0) {
            const data = res.data.observations[0];
            const title = series === 'CPIAUCSL' ? 'US Inflation (CPI)' : 'US GDP';
            
            items.push({
              category: 'economic',
              source: 'FRED',
              external_id: generateContentHash('FRED', series, data.date),
              title: `${title}: ${data.value}`,
              content: `Latest ${title} data released: ${data.value}`,
              url: `https://fred.stlouisfed.org/series/${series}`,
              published_at: new Date(data.date),
              tickers: ['SPY', 'USD', 'TLT'],
              raw_metadata: { value: data.value, series },
              expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            });
        }
    }

    if (items.length > 0) {
        liveStatusService.update('fred', 'new_data', `${items.length} macro indicators`, items.length);
    } else {
        liveStatusService.update('fred', 'cached', 'Data up to date', 0);
    }

  } catch (e: any) {
      console.error(`   FRED Failed: ${e.message}`);
      liveStatusService.update('fred', 'error', 'Connection Failed');
  }

  return items;
}
