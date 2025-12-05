import axios from 'axios';

const FMP_KEY = "RqU4R074T8aTT9V5aMLm25j3Ff4AT3Ko";

async function debug() {
    console.log("🔑 DEBUGGING FMP ENDPOINTS...");
    
    const endpoints = [
        { name: 'v3 Quote Short', url: `https://financialmodelingprep.com/stable/quote-short/AAPL?apikey=${FMP_KEY}` },
        { name: 'v3 Quote',       url: `https://financialmodelingprep.com/stable/quote/AAPL?apikey=${FMP_KEY}` },
        { name: 'v3 Profile',     url: `https://financialmodelingprep.com/stable/profile/AAPL?apikey=${FMP_KEY}` },
        { name: 'v4 Price',       url: `https://financialmodelingprep.com/stable/quote/AAPL?apikey=${FMP_KEY}` } // Often works for new plans
    ];

    for (const ep of endpoints) {
        process.stdout.write(`   Testing ${ep.name}... `);
        try {
            const res = await axios.get(ep.url, { timeout: 5000 });
            if (res.data && Array.isArray(res.data) && res.data.length > 0) {
                console.log("✅ SUCCESS");
                console.log(`      -> Data: ${JSON.stringify(res.data[0]).substring(0, 100)}...`);
            } else if (res.data && res.data.error) {
                console.log(`❌ API ERROR: ${res.data.error}`);
            } else {
                console.log("⚠️  EMPTY RESPONSE");
            }
        } catch (e: any) {
            console.log(`❌ FAILED`);
            console.log(`      -> Status: ${e.response?.status} (${e.response?.statusText})`);
            if (e.response?.data) {
                console.log(`      -> Message: ${JSON.stringify(e.response.data)}`);
            }
        }
    }

    console.log("\n🔑 DEBUGGING CRYPTO BACKUPS...");
    try {
        console.log("   Testing CoinCap (Free)...");
        const res = await axios.get("https://api.coincap.io/v2/assets/bitcoin", { timeout: 10000 }); // 10s timeout
        if (res.data?.data?.priceUsd) {
            console.log(`   ✅ CoinCap Success: $${parseFloat(res.data.data.priceUsd).toFixed(2)}`);
        } else {
            console.log("   ❌ CoinCap Empty");
        }
    } catch (e: any) {
        console.log(`   ❌ CoinCap Failed: ${e.message}`);
    }
}

debug();
