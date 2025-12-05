import axios from 'axios';
import liveStatusService from '../liveStatusService.js';
import pool from '../../db/index.js';

const FMP_KEY = process.env.FMP_API_KEY;

export async function collectCoinGecko() {
    // Renamed function for compatibility, but logic upgraded to FMP
    await liveStatusService.update('coingecko', 'scanning', 'Fetching Crypto...');
    
    // 1. Try FMP First (Paid/Stable)
    if (FMP_KEY) {
        try {
            const url = `https://financialmodelingprep.com/stable/quote?symbol=BTCUSD,ETHUSD,SOLUSD,DOGEUSD,XRPUSD&apikey=${FMP_KEY}`;
            const res = await axios.get(url, { timeout: 5000 });
            
            if (Array.isArray(res.data) && res.data.length > 0) {
                await liveStatusService.update('coingecko', 'new_data', `BTC: $${res.data[0].price}`, res.data.length);
                
                // Store raw intelligence
                const btc = res.data.find((c: any) => c.symbol === 'BTCUSD');
                if (btc) {
                     await pool.query(`
                      INSERT INTO raw_intelligence (source, category, title, published_at, external_id)
                      VALUES ('FMP Crypto', 'crypto', $1, NOW(), $2)
                      ON CONFLICT (external_id) DO UPDATE SET published_at = NOW(), title = $1
                    `, [`BTC: $${btc.price} (${btc.changesPercentage.toFixed(2)}%)`, `price-btc-${new Date().toISOString().split('T')[0]}`]);
                }
                return res.data;
            }
        } catch (e) {
             // FMP Failed, fall through to backup
             console.warn("FMP Crypto Failed, falling back...");
        }
    }

    // 2. CoinGecko Backup (Free Tier - High Risk of 429)
    try {
        const res = await axios.get('https://api.coingecko.com/stable/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true', { timeout: 4000 });
        if (res.data.bitcoin) {
            await liveStatusService.update('coingecko', 'new_data', `BTC (CG): $${res.data.bitcoin.usd}`, 3);
            return [{ symbol: 'BTC', price: res.data.bitcoin.usd }];
        }
    } catch (e: any) {
        if (e.response?.status === 429) {
             await liveStatusService.update('coingecko', 'error', 'Rate Limit (429)');
        } else {
             await liveStatusService.update('coingecko', 'error', 'API Error');
        }
    }
    return [];
}
