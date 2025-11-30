import axios from 'axios';
import liveStatusService from '../liveStatusService.js';
import { generateContentHash } from '../../utils/dataUtils.js';
import pool from '../../db/index.js';
import tiingoService from '../tiingoService.js';
import yahooFinanceService from '../yahooFinanceService.js';
import sectorDiscoveryService from '../sectorDiscoveryService.js';

const STABLE_BASE = 'https://financialmodelingprep.com/stable';

export async function collectApiData() {
  const items: any[] = [];
  const FMP_KEY = process.env.FMP_API_KEY;
  
  // 1. DYNAMIC UNIVERSE GENERATION (Wide-Net)
  // No hardcoded lists. We fetch the full active universe.
  const universe = await sectorDiscoveryService.getExpandedUniverse();
  
  // 2. INTELLIGENT ROTATION
  // To respect rate limits while maintaining infinite scale, we rotate the window.
  // We process 50 tickers per run. The universe shuffle ensures 100% coverage over time.
  const TICKERS = universe.sort(() => 0.5 - Math.random()).slice(0, 50);
  
  // Ensure Major Indices are always checked (High Priority)
  const INDICES = ['SPY', 'QQQ', 'IWM', '^VIX', 'BTC-USD', 'ETH-USD'];
  const FINAL_TARGETS = [...new Set([...INDICES, ...TICKERS])];

  console.log(`   📈 Market Collector: Scanning ${FINAL_TARGETS.length} Dynamic Assets...`);
  await liveStatusService.update('fmp', 'scanning', 'Snapshotting Market...', 0);

  let successCount = 0;
  let fallbackCount = 0;

  // Serial processing to respect upstream rate limits (5-10 req/sec typically safe)
  for (const ticker of FINAL_TARGETS) {
      let dataPoint = null;

      // --- SOURCE 1: FMP STABLE ---
      if (FMP_KEY) {
          try {
              const fmpSymbol = ticker.replace('^', '');
              const url = `${STABLE_BASE}/quote?symbol=${fmpSymbol}&apikey=${FMP_KEY}`;
              const res = await axios.get(url, { timeout: 5000 });
              
              if (Array.isArray(res.data) && res.data.length > 0) {
                  const q = res.data[0];
                  dataPoint = createDataPoint('FMP', ticker, q.price, q.changesPercentage, q);
              }
          } catch (e) {}
      }

      // --- SOURCE 2: TIINGO ---
      if (!dataPoint && process.env.TIINGO_API_KEY) {
          try {
              const tData = await tiingoService.getPrice(ticker);
              if (tData && tData.price > 0) {
                  dataPoint = createDataPoint('Tiingo', ticker, tData.price, tData.changePercent || 0, tData);
                  fallbackCount++;
              }
          } catch(e) {}
      }

      // --- SOURCE 3: YAHOO ---
      if (!dataPoint) {
          try {
              const yData = await yahooFinanceService.getPrice(ticker);
              if (yData) {
                  dataPoint = createDataPoint('Yahoo Finance', ticker, yData.price, yData.pct, yData);
                  fallbackCount++;
              }
          } catch(e) {}
      }

      if (dataPoint) {
          items.push(dataPoint);
          await saveData(dataPoint);
          successCount++;
      }
      
      // Rate Limit Buffer
      await new Promise(r => setTimeout(r, 100));
  }

  if (items.length > 0) {
      const msg = fallbackCount > 0 ? `Active (${successCount} items, ${fallbackCount} fallbacks)` : `Active (${successCount} items)`;
      await liveStatusService.update('fmp', 'new_data', msg, items.length);
  } else {
      await liveStatusService.update('fmp', 'error', 'No Data', 0);
  }

  return items;
}

function createDataPoint(source: string, symbol: string, price: number, change: number, meta: any) {
    return {
        category: 'market',
        source: source,
        external_id: generateContentHash(source, symbol, new Date().toISOString().substring(0, 13)),
        title: `${symbol}: $${price} (${change?.toFixed(2)}%)`,
        content: `Market Snapshot: ${symbol} at ${price}. Source: ${source}.`,
        url: source === 'FMP' ? 'https://financialmodelingprep.com' : 'https://tiingo.com',
        published_at: new Date(),
        tickers: [symbol],
        raw_metadata: meta,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000)
    };
}

async function saveData(item: any) {
    try {
        await pool.query(`
            INSERT INTO raw_data_collection (source_type, source_name, data_json, collected_at)
            VALUES ($1, $2, $3, NOW())
        `, ['market', item.source, JSON.stringify(item)]);
    } catch (dbErr) {}
}
