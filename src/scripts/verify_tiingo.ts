import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const TIINGO_KEY = process.env.TIINGO_API_KEY;

async function test() {
    console.log("🔍 Diagnostic Data Check...");

    // 1. STOCK CHECK (Tiingo)
    if (TIINGO_KEY) {
        process.stdout.write("   1. Tiingo Stock (AAPL)... ");
        try {
            const url = `https://api.tiingo.com/iex/AAPL?token=${TIINGO_KEY}`;
            const res = await axios.get(url, { timeout: 5000 });
            
            if (res.data && res.data.length > 0) {
                const d = res.data[0];
                // The Service logic: Check all fields
                const price = d.last || d.tngoLast || d.prevClose || d.open;
                
                if (price) {
                    console.log(`✅ Success: $${price} (Source: ${d.last ? 'Last' : 'PrevClose'})`);
                } else {
                    console.log(`⚠️  Connected but no price data found.`);
                    console.log(`      Raw Data: ${JSON.stringify(d)}`);
                }
            } else {
                console.log("❌ Empty Response");
            }
        } catch (e: any) {
            console.log(`❌ Failed: ${e.message}`);
        }
    }

    // 2. CRYPTO CHECK (CoinGecko - Primary)
    process.stdout.write("   2. CoinGecko (Crypto)...  ");
    try {
        const res = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd', { timeout: 5000 });
        if (res.data.bitcoin) {
            console.log(`✅ Success: $${res.data.bitcoin.usd}`);
        } else {
            console.log("❌ Failed");
        }
    } catch (e: any) {
        console.log(`❌ Error: ${e.message}`);
    }
    
    // 3. YAHOO CHECK (Emergency Fallback)
    process.stdout.write("   3. Yahoo (Fallback)...    ");
    try {
        const url = "https://query1.finance.yahoo.com/v8/finance/chart/AAPL?interval=1d&range=1d";
        const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 4000 });
        const meta = res.data?.chart?.result?.[0]?.meta;
        if (meta?.regularMarketPrice || meta?.previousClose) {
            console.log(`✅ Success: $${meta.regularMarketPrice || meta.previousClose}`);
        } else {
            console.log("❌ Failed structure");
        }
    } catch (e: any) {
        console.log(`❌ Error: ${e.message}`);
    }
}

test();
