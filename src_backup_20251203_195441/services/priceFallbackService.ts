import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Points to src/data/cache in dev, or dist/data/cache in prod
const CACHE_PATH = path.resolve(__dirname, '../data/cache/last_prices.json');

interface CachedPrice {
    price: number;
    change: number;
    changePercent: number;
    timestamp: number;
    source: string;
}

class PriceFallbackService {
    
    private getApiKey(): string {
        return process.env.FMP_API_KEY || '';
    }

    private loadCache(): Record<string, CachedPrice> {
        try {
            if (fs.existsSync(CACHE_PATH)) {
                const raw = fs.readFileSync(CACHE_PATH, 'utf-8');
                return JSON.parse(raw);
            }
        } catch (e) {
            console.warn('[PriceFallback] Failed to load cache:', e);
        }
        return {};
    }

    private saveCacheFile(data: Record<string, CachedPrice>) {
        try {
            const dir = path.dirname(CACHE_PATH);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(CACHE_PATH, JSON.stringify(data, null, 2));
        } catch (e) {
            console.error('[PriceFallback] Failed to save cache:', e);
        }
    }

    public async getFromCache(ticker: string): Promise<CachedPrice | null> {
        const cache = this.loadCache();
        const item = cache[ticker.toUpperCase()];
        if (item) {
            console.log(`[PriceService] ⚠️ Retrieved ${ticker} from Local Cache (${new Date(item.timestamp).toISOString()})`);
            return item;
        }
        return null;
    }

    public async saveToCache(ticker: string, data: CachedPrice) {
        const cache = this.loadCache();
        cache[ticker.toUpperCase()] = data;
        this.saveCacheFile(cache);
    }

    public async fetchV3Fallback(ticker: string): Promise<CachedPrice | null> {
        const key = this.getApiKey();
        if (!key) return null;

        try {
            // Explicitly using the v3 endpoint structure for fallback
            const url = `https://financialmodelingprep.com/stable/quote/${ticker}?apikey=${key}`;
            const res = await axios.get(url, { timeout: 5000 });
            
            if (Array.isArray(res.data) && res.data.length > 0) {
                const d = res.data[0];
                console.log(`[PriceService] ⚠️ Retrieved ${ticker} from FMP v3 Fallback`);
                return {
                    price: d.price,
                    change: d.change,
                    changePercent: d.changesPercentage,
                    timestamp: Date.now(),
                    source: 'FMPv3'
                };
            }
        } catch (e: any) {
            // Silent fail, proceed to cache
        }
        return null;
    }
}

export default new PriceFallbackService();
