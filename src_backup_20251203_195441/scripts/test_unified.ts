import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const FMP_KEY = process.env.FMP_API_KEY;
const TIINGO_KEY = process.env.TIINGO_API_KEY;

async function runTest() {
    console.log("🔍 Running Unified Data Pipeline Test...");
    console.log(`   Keys Loaded: FMP=${!!FMP_KEY}, Tiingo=${!!TIINGO_KEY}`);

    // --- LOGIC 1: TIINGO FETCHER ---
    async function getTiingoPrice(ticker: string) {
        if (!TIINGO_KEY) return null;
        const isCrypto = ticker.toLowerCase().endsWith('usd') || ['btc','eth'].includes(ticker.toLowerCase());
        try {
            if (isCrypto) {
                const clean = ticker.toLowerCase().replace('-','');
                const url = `https://api.tiingo.com/tiingo/crypto/top?tickers=${clean}&token=${TIINGO_KEY}`;
                const res = await axios.get(url, { timeout: 4000 });
                if (res.data && res.data.length > 0 && res.data[0].topOfBookData) return parseFloat(res.data[0].topOfBookData[0].lastPrice);
            } else {
                const url = `https://api.tiingo.com/iex/${ticker}?token=${TIINGO_KEY}`;
                const res = await axios.get(url, { timeout: 4000 });
                if (res.data && res.data.length > 0) return res.data[0].tngoLast || res.data[0].last;
            }
        } catch (e) { return null; }
        return null;
    }

    // --- LOGIC 2: MARKET DATA FETCHER (The logic from marketDataService) ---
    async function getPrice(rawSymbol: string) {
        const symbol = rawSymbol.toUpperCase();
        const isCrypto = symbol.includes('-USD') || ['BTC', 'ETH', 'SOL'].includes(symbol);
        
        let fmpTicker = symbol;
        let tiingoTicker = symbol;
        
        if (isCrypto) {
            const clean = symbol.replace('-USD', '').replace('USD', '');
            fmpTicker = `${clean}USD`;
            tiingoTicker = `${clean.toLowerCase()}usd`;
        }

        // 1. FMP
        if (FMP_KEY) {
            try {
                const url = `https://financialmodelingprep.com/stable/quote-short/${fmpTicker}?apikey=${FMP_KEY}`;
                const res = await axios.get(url, { timeout: 4000 });
                if (res.data && res.data.length > 0) {
                    console.log(`   ✅ FMP: ${fmpTicker} ($${res.data[0].price})`);
                    return;
                }
            } catch (e) {}
        }

        // 2. Tiingo
        const tPrice = await getTiingoPrice(isCrypto ? tiingoTicker : symbol);
        if (tPrice) {
            console.log(`   ✅ Tiingo: ${symbol} ($${tPrice})`);
            return;
        }

        // 3. CoinCap
        if (isCrypto) {
            try {
                const clean = symbol.replace('-USD', '').replace('USD', '');
                const idMap: Record<string, string> = { 'BTC': 'bitcoin', 'ETH': 'ethereum' };
                const id = idMap[clean] || clean.toLowerCase();
                const res = await axios.get(`https://api.coincap.io/v2/assets/${id}`, { timeout: 3000 });
                if (res.data?.data?.priceUsd) {
                     console.log(`   ✅ CoinCap: ${clean} ($${parseFloat(res.data.data.priceUsd).toFixed(2)})`);
                     return;
                }
            } catch(e) {}
        }

        console.log(`   ❌ FAILED: ${symbol}`);
    }

    console.log("\n-- STARTING CHECKS --");
    await getPrice('AAPL');
    await getPrice('BTC');
    await getPrice('BTC-USD'); // Verify translation
    await getPrice('SOL');
}

runTest();
